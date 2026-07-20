import { NextResponse } from "next/server";
import { z } from "zod";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const staffCreateSchema = z.object({
  username: z.string().trim().min(3),
  name: z.string().trim().min(2),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "WAITER", "KITCHEN", "BAR"]),
});

const publicSelect = {
  id: true,
  username: true,
  name: true,
  role: true,
} as const;

export async function GET() {
  const users = await prisma.staffUser.findMany({
    select: publicSelect,
    orderBy: [{ role: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const payload = staffCreateSchema.parse(await request.json());
  const existing = await prisma.staffUser.findUnique({
    where: { username: payload.username },
  });

  if (existing) {
    return NextResponse.json({ message: "Пользователь с таким логином уже существует" }, { status: 409 });
  }

  const user = await prisma.staffUser.create({
    data: {
      username: payload.username,
      name: payload.name,
      role: payload.role,
      passwordHash: hashPassword(payload.password),
    },
    select: publicSelect,
  });

  return NextResponse.json(user, { status: 201 });
}
