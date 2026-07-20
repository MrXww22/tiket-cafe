import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { tableUpdateSchema } from "@/lib/validators";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const payload = tableUpdateSchema.parse(await request.json());
  if (payload.waiterId) {
    const waiter = await prisma.staffUser.findFirst({
      where: {
        id: payload.waiterId,
        role: "WAITER",
      },
    });

    if (!waiter) {
      return NextResponse.json({ message: "Официант не найден" }, { status: 400 });
    }
  }

  const table = await prisma.diningTable.update({
    where: { id },
    data: {
      ...payload,
      waiterId: payload.waiterId === null ? null : payload.waiterId,
    },
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
  });

  return NextResponse.json(table);
}
