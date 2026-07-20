import { NextResponse } from "next/server";
import { createDepartmentNotification } from "@/lib/department-notifications";
import { prisma } from "@/lib/prisma";
import { handleNewDeliveryOrder } from "@/lib/virtual-manager";
import { deliveryOrderCreateSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const payload = deliveryOrderCreateSchema.parse(await request.json());
  const productIds = payload.items.map((item) => item.productId);
  const products = await prisma.product.findMany({
    where: {
      id: { in: productIds },
      isPaused: false,
      isDeleted: false,
    },
  });

  if (products.length !== productIds.length) {
    return NextResponse.json({ message: "В заказе есть недоступные блюда" }, { status: 400 });
  }

  const orderTotal = payload.items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const activeShift = await prisma.workShift.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
  });

  const order = await prisma.order.create({
    data: {
      orderType: "DELIVERY",
      deliveryStatus: "NEW",
      shiftId: activeShift?.id,
      comment: payload.comment,
      totalAmount: orderTotal,
      customerName: payload.customerName,
      customerPhone: payload.customerPhone,
      deliveryAddress: payload.deliveryAddress,
      deliveryEntrance: payload.deliveryEntrance,
      deliveryFloor: payload.deliveryFloor,
      deliveryApartment: payload.deliveryApartment,
      deliveryLat: payload.deliveryLat,
      deliveryLng: payload.deliveryLng,
      items: {
        create: payload.items.map((item) => {
          const product = products.find((candidate) => candidate.id === item.productId);
          if (!product) throw new Error("Product not found");

          return {
            productId: product.id,
            quantity: item.quantity,
            price: product.price,
          };
        }),
      },
    },
    include: {
      table: true,
      items: { include: { product: true } },
    },
  });

  const departments = [...new Set(order.items.map((item) => item.product.department))];
  await Promise.all(
    departments.map((department) => {
      const departmentItems = order.items.filter((item) => item.product.department === department);
      const message = `Новая доставка #${order.number}: ${departmentItems
        .map((item) => `${item.product.name} x${item.quantity}`)
        .join(", ")}`;

      return createDepartmentNotification({
        department,
        orderId: order.id,
        tableNumber: 0,
        title: "Новая доставка",
        message,
      });
    }),
  );

  await handleNewDeliveryOrder(order);

  return NextResponse.json(order, { status: 201 });
}
