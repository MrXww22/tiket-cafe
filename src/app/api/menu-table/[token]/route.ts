import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = {
  params: Promise<{ token: string }>;
};

export async function GET(_request: Request, { params }: Params) {
  const { token } = await params;
  const table = await prisma.diningTable.findUnique({
    where: { qrToken: token },
    select: {
      number: true,
    },
  });

  if (!table) {
    return NextResponse.json({ message: "QR-код недействителен" }, { status: 404 });
  }

  return NextResponse.json(table);
}
