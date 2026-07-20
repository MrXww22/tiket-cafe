import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionToken, sessionCookieName, shiftMaxAge } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

const loginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  const payload = loginSchema.parse(await request.json());
  const user = await prisma.staffUser.findUnique({
    where: { username: payload.username },
  });

  if (!user || !verifyPassword(payload.password, user.passwordHash)) {
    return NextResponse.json({ message: "Неверный логин или пароль" }, { status: 401 });
  }

  const token = await createSessionToken({
    id: user.id,
    username: user.username,
    name: user.name,
    role: user.role,
  });

  const store = await cookies();
  store.set(sessionCookieName, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: shiftMaxAge,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    },
  });
}
