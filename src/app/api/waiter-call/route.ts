import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notifyWaiters } from "@/lib/telegram";
import { createWaiterNotificationForTable } from "@/lib/waiter-notifications";

const waiterCallSchema = z.object({
  tableToken: z.string().trim().min(10).optional(),
  tableNumber: z.coerce.number().int().positive().optional(),
  source: z.enum(["GUEST", "KITCHEN", "BAR"]).optional().default("GUEST"),
});

export async function POST(request: Request) {
  const payload = waiterCallSchema.parse(await request.json());
  let tableNumber = payload.tableNumber;

  if (payload.tableToken) {
    const table = await prisma.diningTable.findUnique({
      where: { qrToken: payload.tableToken },
      select: { number: true },
    });

    if (!table) {
      return NextResponse.json({ message: "QR-код недействителен" }, { status: 404 });
    }

    tableNumber = table.number;
  } else {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });
  }

  if (!tableNumber) {
    return NextResponse.json({ message: "Столик не найден" }, { status: 400 });
  }

  const sourceLabel = payload.source === "KITCHEN" ? "Кухня" : payload.source === "BAR" ? "Бар" : `Столик ${tableNumber}`;
  const message =
    payload.source === "GUEST"
      ? `Столик ${tableNumber} вызывает официанта`
      : `${sourceLabel} вызывает официанта по заказу столика ${tableNumber}`;
  await createWaiterNotificationForTable({
    type: "WAITER_CALL",
    tableNumber,
    title: payload.source === "GUEST" ? "Вызов официанта" : `${sourceLabel} вызывает официанта`,
    message,
  });
  await notifyWaiters(message);

  return NextResponse.json({ ok: true });
}
