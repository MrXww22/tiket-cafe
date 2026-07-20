import { NextResponse } from "next/server";
import { createDepartmentNotification } from "@/lib/department-notifications";
import { getCurrentUser } from "@/lib/auth";
import { formatOrderMessage } from "@/lib/orders";
import { prisma } from "@/lib/prisma";
import { getRestaurantSettings } from "@/lib/settings";
import { notifyWaiters } from "@/lib/telegram";
import { orderCreateSchema } from "@/lib/validators";

export async function GET() {
  const user = await getCurrentUser();

  const orders = await prisma.order.findMany({
    where:
      user?.role === "WAITER"
        ? {
            OR: [{ orderType: "DELIVERY" }, { table: { waiterId: user.id } }],
          }
        : undefined,
    include: {
      table: true,
      review: true,
      items: {
        include: { product: true },
        orderBy: { createdAt: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 80,
  });

  return NextResponse.json(orders);
}

export async function POST(request: Request) {
  const payload = orderCreateSchema.parse(await request.json());
  const settings = await getRestaurantSettings();
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

  const table = await prisma.diningTable.findUnique({
    where: { qrToken: payload.tableToken },
  });

  if (!table) {
    return NextResponse.json({ message: "QR-код недействителен" }, { status: 404 });
  }

  const orderTotal = payload.items.reduce((sum, item) => {
    const product = products.find((candidate) => candidate.id === item.productId);
    return sum + (product?.price || 0) * item.quantity;
  }, 0);

  const activeShift = await prisma.workShift.findFirst({
    where: { closedAt: null },
    orderBy: { openedAt: "desc" },
  });

  const order = await prisma.$transaction(async (tx) => {
    const busyTable = await tx.diningTable.update({
      where: { id: table.id },
      data: { status: "BUSY" },
    });

    return tx.order.create({
      data: {
        tableId: busyTable.id,
        shiftId: activeShift?.id,
        comment: payload.comment,
        totalAmount: orderTotal,
        waiterPercent: settings.waiterPercent,
        waiterAmount: Math.round((orderTotal * settings.waiterPercent) / 100),
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
  });

  const departments = [...new Set(order.items.map((item) => item.product.department))];
  await Promise.all(
    departments.map((department) => {
      const departmentItems = order.items.filter((item) => item.product.department === department);
      const message = `Новый заказ #${order.number}, столик ${order.table?.number || "..."}: ${departmentItems
        .map((item) => `${item.product.name} x${item.quantity}`)
        .join(", ")}`;

      return createDepartmentNotification({
        department,
        orderId: order.id,
        tableNumber: order.table?.number || 0,
        title: "Новый заказ",
        message,
      });
    }),
  );

  await notifyWaiters(formatOrderMessage(order));

  return NextResponse.json(order, { status: 201 });
}
