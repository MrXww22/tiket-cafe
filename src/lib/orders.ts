type OrderForMessage = {
  number: number;
  comment: string;
  orderType?: "DINE_IN" | "DELIVERY";
  table?: { number: number } | null;
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?: string;
  deliveryEntrance?: string;
  deliveryFloor?: string;
  deliveryApartment?: string;
  deliveryLat?: number | null;
  deliveryLng?: number | null;
  items: Array<{
    quantity: number;
    product: {
      name: string;
      department: "KITCHEN" | "BAR";
    };
  }>;
};

const departmentTitle = {
  KITCHEN: "Кухня",
  BAR: "Бар",
};

export function getOrderPlaceLabel(order: { orderType?: "DINE_IN" | "DELIVERY"; table?: { number: number } | null; number: number }) {
  return order.orderType === "DELIVERY" ? `Доставка #${order.number}` : `Столик ${order.table?.number || "..."}`;
}

export function getMapUrl(order: { deliveryAddress?: string; deliveryLat?: number | null; deliveryLng?: number | null }) {
  if (order.deliveryLat != null && order.deliveryLng != null) {
    return `https://www.google.com/maps/search/?api=1&query=${order.deliveryLat},${order.deliveryLng}`;
  }

  if (!order.deliveryAddress?.trim()) return "";
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(order.deliveryAddress.trim())}`;
}

export function formatOrderMessage(order: OrderForMessage) {
  const lines = [`Новый заказ #${order.number}`, `${getOrderPlaceLabel(order)}`, ""];

  if (order.orderType === "DELIVERY") {
    lines.push(`Клиент: ${order.customerName || "не указан"}`);
    lines.push(`Телефон: ${order.customerPhone || "не указан"}`);
    lines.push(`Адрес: ${order.deliveryAddress || "не указан"}`);
    const details = [
      order.deliveryEntrance ? `подъезд ${order.deliveryEntrance}` : "",
      order.deliveryFloor ? `этаж ${order.deliveryFloor}` : "",
      order.deliveryApartment ? `кв./офис ${order.deliveryApartment}` : "",
    ].filter(Boolean);
    if (details.length) lines.push(`Детали: ${details.join(", ")}`);
    const mapUrl = getMapUrl(order);
    if (mapUrl) lines.push(`Карта: ${mapUrl}`);
    lines.push("");
  }

  for (const department of ["KITCHEN", "BAR"] as const) {
    const items = order.items.filter((item) => item.product.department === department);
    if (!items.length) continue;

    lines.push(`${departmentTitle[department]}:`);
    for (const item of items) {
      lines.push(`- ${item.product.name} x${item.quantity}`);
    }
    lines.push("");
  }

  if (order.comment) {
    lines.push(`Комментарий: ${order.comment}`);
  }

  return lines.join("\n").trim();
}

export function formatReadyMessage(tableNumber: number, productNames: string[]) {
  return [`Столик ${tableNumber}: готово`, "", ...productNames.map((name) => `- ${name}`)].join("\n");
}

export function formatReadyOrderMessage(order: OrderForMessage, productNames: string[]) {
  return [`${getOrderPlaceLabel(order)}: готово`, "", ...productNames.map((name) => `- ${name}`)].join("\n");
}
