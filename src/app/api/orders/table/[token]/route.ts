import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const table = await prisma.diningTable.findUnique({
    where: { qrToken: token },
  });

  if (!table) {
    return NextResponse.json({ message: "QR-код недействителен" }, { status: 404 });
  }

  const orders = await prisma.order.findMany({
    where: {
      tableId: table.id,
      createdAt: {
        gte: new Date(Date.now() - 1000 * 60 * 60 * 12),
      },
      status: { not: "CANCELED" },
    },
    include: {
      review: true,
      items: {
        include: { product: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json(orders);
}
