import { NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { cashTotal, normalizeCashCount } from "@/lib/cash";
import { prisma } from "@/lib/prisma";

const cashSchema = z.record(z.string(), z.coerce.number().int().min(0));

const openShiftSchema = z.object({
  openingCash: cashSchema,
  note: z.string().trim().optional().default(""),
});

export async function GET() {
  const activeShift = await prisma.workShift.findFirst({
    where: { closedAt: null },
    include: {
      admin: {
        select: { id: true, username: true, name: true, role: true },
      },
    },
    orderBy: { openedAt: "desc" },
  });

  return NextResponse.json({ activeShift });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    return NextResponse.json({ message: "Только администратор может открыть смену" }, { status: 403 });
  }

  const existing = await prisma.workShift.findFirst({ where: { closedAt: null } });
  if (existing) {
    return NextResponse.json({ message: "Смена уже открыта" }, { status: 409 });
  }

  const payload = openShiftSchema.parse(await request.json());
  const openingCash = normalizeCashCount(payload.openingCash);
  const shift = await prisma.workShift.create({
    data: {
      adminId: user.id,
      openingCash,
      openingTotal: cashTotal(openingCash),
      note: payload.note,
    },
    include: {
      admin: {
        select: { id: true, username: true, name: true, role: true },
      },
    },
  });

  return NextResponse.json(shift, { status: 201 });
}
