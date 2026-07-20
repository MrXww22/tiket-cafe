import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const staffUpdateSchema = z.object({
  username: z.string().trim().min(3).optional(),
  name: z.string().trim().min(2).optional(),
  password: z.string().min(6).optional().or(z.literal("")),
  role: z.enum(["ADMIN", "WAITER", "KITCHEN", "BAR"]).optional(),
});

const publicSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
} as const;

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { id } = await context.params;
  const payload = staffUpdateSchema.parse(await request.json());

  if (payload.username) {
    const existing = await prisma.staffUser.findFirst({
      where: {
        username: payload.username,
        id: { not: id },
      },
    });

    if (existing) {
      return NextResponse.json({ message: "Пользователь с таким логином уже существует" }, { status: 409 });
    }
  }

  const user = await prisma.staffUser.update({
    where: { id },
    data: {
      username: payload.username,
      name: payload.name,
      role: payload.role,
      ...(payload.password ? { passwordHash: hashPassword(payload.password) } : {}),
    },
    select: publicSelect,
  });

  return NextResponse.json(user);
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { id } = await context.params;
  const currentUser = await getCurrentUser();

  if (currentUser?.id === id) {
    return NextResponse.json({ message: "Нельзя удалить свою учетную запись" }, { status: 400 });
  }

  const user = await prisma.staffUser.findUnique({
    where: { id },
    include: {
      _count: {
        select: { openedShifts: true },
      },
    },
  });

  if (!user) return NextResponse.json({ message: "Сотрудник не найден" }, { status: 404 });

  if (user.role === "ADMIN") {
    const adminCount = await prisma.staffUser.count({ where: { role: "ADMIN" } });
    if (adminCount <= 1) {
      return NextResponse.json({ message: "Нельзя удалить последнего администратора" }, { status: 400 });
    }
  }

  if (user._count.openedShifts > 0) {
    return NextResponse.json({ message: "Нельзя удалить сотрудника, который открывал смены. Измените его роль или данные." }, { status: 400 });
  }

  await prisma.staffUser.delete({ where: { id } });

  return NextResponse.json({ ok: true });
}
