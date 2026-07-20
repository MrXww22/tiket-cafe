import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";

const querySchema = z.object({
  department: z.enum(["KITCHEN", "BAR"]),
});

const readSchema = z.object({
  ids: z.array(z.string()).min(1),
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const payload = querySchema.parse({ department: searchParams.get("department") });
  const notifications = await prisma.departmentNotification.findMany({
    where: {
      department: payload.department,
      readAt: null,
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  return NextResponse.json(notifications);
}

export async function PATCH(request: Request) {
  const payload = readSchema.parse(await request.json());
  await prisma.departmentNotification.updateMany({
    where: {
      id: { in: payload.ids },
      readAt: null,
    },
    data: { readAt: new Date() },
  });

  return NextResponse.json({ ok: true });
}
