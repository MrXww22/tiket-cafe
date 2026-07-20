import { NextResponse } from "next/server";
import { formatReadyOrderMessage } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { notifyWaiters } from "@/lib/telegram";
import { itemStatusSchema } from "@/lib/validators";
import { createWaiterNotificationForTable } from "@/lib/waiter-notifications";

type Params = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, { params }: Params) {
  const { id } = await params;
  const payload = itemStatusSchema.parse(await request.json());
  const item = await prisma.orderItem.update({
    where: { id },
    data: { status: payload.status },
    include: {
      product: true,
      order: {
        include: {
          table: true,
          items: { include: { product: true } },
        },
      },
    },
  });

  if (payload.status === "COOKING" && item.order.status === "NEW") {
    await prisma.order.update({
      where: { id: item.orderId },
      data: {
        status: "IN_PROGRESS",
        ...(item.order.orderType === "DELIVERY" ? { deliveryStatus: "CONFIRMED" } : {}),
      },
    });
  }

  if (payload.status === "READY") {
    const message = formatReadyOrderMessage(item.order, [`${item.product.name} x${item.quantity}`]);
    if (item.order.table?.number) {
      await createWaiterNotificationForTable({
        type: "ORDER_READY",
        tableNumber: item.order.table.number,
        title: "Заказ готов",
        message,
      });
    }
    await notifyWaiters(message);

    const freshItems = await prisma.orderItem.findMany({
      where: { orderId: item.orderId },
    });
    if (freshItems.every((candidate) => candidate.status === "READY")) {
      await prisma.order.update({
        where: { id: item.orderId },
        data: {
          status: "READY",
          ...(item.order.orderType === "DELIVERY" ? { deliveryStatus: "READY_FOR_PICKUP" } : {}),
        },
      });
    }
  }

  return NextResponse.json(item);
}
