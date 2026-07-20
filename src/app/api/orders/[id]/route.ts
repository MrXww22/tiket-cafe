import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/lib/settings";
import { notifyWaiters } from "@/lib/telegram";
import { createWaiterNotificationForTable } from "@/lib/waiter-notifications";

type Params = {
  params: Promise<{ id: string }>;
};

const updateOrderSchema = z.object({
  status: z.enum(["SERVED", "CANCELED"]),
  paymentMethod: z.enum(["CASH", "CARD", "TRANSFER"]).optional(),
});

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const payload = updateOrderSchema.parse(await request.json());
  const user = await getCurrentUser();

  const order = await prisma.order.update({
    where: { id },
    data: {
      status: payload.status,
      ...(payload.status === "SERVED"
        ? {
            paymentMethod: payload.paymentMethod || "CASH",
            closedAt: new Date(),
            closedById: user?.role === "WAITER" || user?.role === "ADMIN" ? user.id : undefined,
          }
        : {}),
    },
    include: {
      table: true,
      closedBy: {
        select: { id: true, username: true, name: true, role: true },
      },
    },
  });

  if (payload.status === "SERVED") {
    const activeCount = await prisma.order.count({
      where: {
        tableId: order.tableId,
        status: { notIn: ["SERVED", "CANCELED"] },
      },
    });

    if (activeCount === 0) {
      const settings = await getRestaurantSettings();
      await prisma.diningTable.update({
        where: { id: order.tableId },
        data: { status: "CLEANING" },
      });
      const message = `Нужно убрать столик ${order.table.number}. Через ${settings.cleanupMinutes} мин. он станет свободным.`;
      await createWaiterNotificationForTable({
        type: "TABLE_CLEANING",
        tableNumber: order.table.number,
        title: "Нужно убрать столик",
        message,
      });
      await notifyWaiters(message);
    }
  }

  return NextResponse.json(order);
}
