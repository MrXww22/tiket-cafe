import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productCreateSchema } from "@/lib/validators";

export async function GET() {
  const products = await prisma.product.findMany({
    where: { isDeleted: false },
    include: { category: true },
    orderBy: [{ category: { sortOrder: "asc" } }, { name: "asc" }],
  });

  return NextResponse.json(products);
}

export async function POST(request: Request) {
  const payload = productCreateSchema.parse(await request.json());
  const product = await prisma.product.create({
    data: payload,
    include: { category: true },
  });

  return NextResponse.json(product, { status: 201 });
}
