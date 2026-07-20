import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { categoryCreateSchema } from "@/lib/validators";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });

  return NextResponse.json(categories);
}

export async function POST(request: Request) {
  const payload = categoryCreateSchema.parse(await request.json());
  const category = await prisma.category.create({ data: payload });

  return NextResponse.json(category, { status: 201 });
}
