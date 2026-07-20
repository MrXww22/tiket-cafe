import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { productUpdateSchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const payload = productUpdateSchema.parse(await request.json());
  const product = await prisma.product.update({
    where: { id },
    data: payload,
    include: { category: true },
  });

  return NextResponse.json(product);
}

export async function DELETE(_request: Request, { params }: Params) {
  const { id } = await params;
  const product = await prisma.product.update({
    where: { id },
    data: {
      isDeleted: true,
      isPaused: true,
    },
  });

  return NextResponse.json(product);
}
