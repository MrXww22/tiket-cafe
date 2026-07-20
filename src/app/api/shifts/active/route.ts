import { NextResponse } from "next/server";
import { z } from "zod";
import { cashTotal, normalizeCashCount } from "@/lib/cash";
import { prisma } from "@/lib/prisma";

const closeShiftSchema = z.object({
  closingCash: z.record(z.string(), z.coerce.number().int().min(0)),
});

export async function PATCH(request: Request) {
  const activeShift = await prisma.workShift.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
  });

  if (!activeShift) {
    return NextResponse.json({ message: "Открытой смены нет" }, { status: 404 });
  }

  const payload = closeShiftSchema.parse(await request.json());
  const closingCash = normalizeCashCount(payload.closingCash);
  const shift = await prisma.workShift.update({
    where: { id: activeShift.id },
    data: {
      closingCash,
      closingTotal: cashTotal(closingCash),
      closedAt: new Date(),
    },
    include: {
      admin: {
        select: { id: true, username: true, name: true, role: true },
      },
    },
  });

  return NextResponse.json(shift);
}
