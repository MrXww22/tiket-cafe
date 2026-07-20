import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { orderReviewSchema } from "@/lib/validators";

export async function GET() {
  const reviews = await prisma.customerReview.findMany({
    include: {
      table: true,
      waiter: {
        select: { id: true, username: true, name: true, role: true },
      },
      order: {
        include: {
          closedBy: {
            select: { id: true, username: true, name: true, role: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json(reviews);
}

export async function POST(request: Request) {
  const payload = orderReviewSchema.parse(await request.json());
  const order = await prisma.order.findUnique({
    where: { id: payload.orderId },
    include: {
      table: true,
    },
  });

  if (!order || order.status !== "SERVED" || !order.table) {
    return NextResponse.json({ message: "Отзыв можно оставить только после закрытия заказа" }, { status: 400 });
  }

  const review = await prisma.customerReview.upsert({
    where: { orderId: order.id },
    create: {
      orderId: order.id,
      tableId: order.tableId,
      waiterId: order.closedById || order.table.waiterId,
      rating: payload.rating,
      comment: payload.comment,
    },
    update: {
      waiterId: order.closedById || order.table.waiterId,
      rating: payload.rating,
      comment: payload.comment,
    },
  });

  return NextResponse.json(review, { status: 201 });
}
