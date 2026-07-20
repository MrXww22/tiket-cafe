import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const readSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });

  const notifications = await prisma.waiterNotification.findMany({
    where: {
      readAt: null,
      ...(user.role === "WAITER" ? { waiterId: user.id } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ message: "Требуется авторизация" }, { status: 401 });

  const payload = readSchema.parse(await request.json());
  await prisma.waiterNotification.updateMany({
    where: {
      id: { in: payload.ids },
      readAt: null,
      ...(user.role === "WAITER" ? { waiterId: user.id } : {}),
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
