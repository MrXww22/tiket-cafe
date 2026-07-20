import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const csvEscape = (value: unknown) => {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
};

const paymentLabels: Record<string, string> = {
  CASH: "Наличные",
  CARD: "Карта",
  TRANSFER: "Перевод",
};

const periodRange = (period: string | null, from: string | null, to: string | null) => {
  const now = new Date();
  let start = from ? new Date(from) : new Date(now);
  let end = to ? new Date(to) : new Date(now);

  if (!from) {
    if (period === "month") {
      start = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (period === "quarter") {
      start = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
    } else {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    }
  }

  if (!to) {
    end = new Date(now.getTime());
  } else {
    end.setHours(23, 59, 59, 999);
  }

  return { start, end };
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const { start, end } = periodRange(searchParams.get("period"), searchParams.get("from"), searchParams.get("to"));

  const orders = await prisma.order.findMany({
    where: {
      createdAt: {
        gte: start,
        lte: end,
      },
    },
    include: {
      table: true,
      closedBy: {
        select: { name: true, username: true },
      },
      items: {
        include: { product: true },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  const paymentTotals = orders.reduce<Record<string, number>>((acc, order) => {
    const method = order.paymentMethod || "Не оплачен";
    acc[method] = (acc[method] || 0) + order.totalAmount;
    return acc;
  }, {});

  const header = [
    "Заказ",
    "Столик",
    "Статус",
    "Создан",
    "Закрыт",
    "Официант",
    "Способ оплаты",
    "Сумма",
    "Процент официанта",
    "Сумма официанту",
    "Позиции",
  ];
  const rows = orders.map((order) => {
    const items = order.items.map((item) => `${item.product.name} x${item.quantity}`).join("; ");
    return [
      order.number,
      order.orderType === "DELIVERY" ? `Доставка: ${order.deliveryAddress}` : order.table?.number || "",
      order.status,
      order.createdAt.toISOString(),
      order.closedAt?.toISOString() || "",
      order.closedBy ? `${order.closedBy.name} (${order.closedBy.username})` : "",
      order.paymentMethod ? paymentLabels[order.paymentMethod] : "",
      order.totalAmount,
      order.waiterPercent,
      order.waiterAmount,
      items,
    ];
  });

  const summaryRows = [
    [],
    ["Итого по оплатам"],
    ...Object.entries(paymentTotals).map(([method, total]) => [paymentLabels[method] || method, total]),
  ];

  const csv = [header, ...rows, ...summaryRows].map((row) => row.map(csvEscape).join(",")).join("\n");
  return new NextResponse(`\uFEFF${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="orders-report-${start.toISOString().slice(0, 10)}.csv"`,
    },
  });
}
