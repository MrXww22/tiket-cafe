import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/lib/settings";
import { tableCreateSchema } from "@/lib/validators";

export async function GET() {
  const settings = await getRestaurantSettings();
  const cleanupDeadline = new Date(Date.now() - settings.cleanupMinutes * 60 * 1000);
  await prisma.diningTable.updateMany({
    where: {
      status: "CLEANING",
      updatedAt: { lte: cleanupDeadline },
    },
    data: { status: "FREE" },
  });

  const tables = await prisma.diningTable.findMany({
    include: {
      waiter: {
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
        },
      },
    },
    orderBy: { number: "asc" },
  });

  return NextResponse.json(tables);
}

export async function POST(request: Request) {
  const payload = tableCreateSchema.parse(await request.json());
  const existing = await prisma.diningTable.findUnique({
    where: { number: payload.number },
  });

  if (existing) {
    return NextResponse.json({ message: "Столик с таким номером уже существует" }, { status: 409 });
  }

  const table = await prisma.diningTable.create({ data: payload });

  return NextResponse.json(table, { status: 201 });
}
