type OrderForMessage = {
  number: number;
  comment: string;
  table: { number: number };
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

export function formatOrderMessage(order: OrderForMessage) {
  const lines = [`Новый заказ #${order.number}`, `Столик: ${order.table.number}`, ""];

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
