import { formatOrderMessage, getMapUrl } from "@/lib/orders";
import { notifyDelivery, notifyWaiters } from "@/lib/telegram";
import { getWhatsappTextUrl, sendWhatsappText } from "@/lib/whatsapp";

type DeliveryOrderForManager = Parameters<typeof formatOrderMessage>[0] & {
  totalAmount: number;
};

export function formatCustomerDeliveryMessage(order: DeliveryOrderForManager) {
  return [
    `Здравствуйте, ${order.customerName || "ваш заказ принят"}.`,
    `Заказ #${order.number} принят в работу.`,
    `Адрес: ${order.deliveryAddress}`,
    `Сумма: ${order.totalAmount}`,
    "",
    "Мы сообщим, когда заказ будет передан доставщику.",
  ].join("\n");
}

export function formatDriverDeliveryMessage(order: DeliveryOrderForManager) {
  const mapUrl = getMapUrl(order);
  const customerUrl = getWhatsappTextUrl(
    order.customerPhone || "",
    `Здравствуйте. Я доставщик по заказу #${order.number}. Скоро буду у вас.`,
  );

  return [
    `Доставка #${order.number}`,
    `Клиент: ${order.customerName}`,
    `Телефон: ${order.customerPhone}`,
    `Адрес: ${order.deliveryAddress}`,
    order.deliveryEntrance ? `Подъезд: ${order.deliveryEntrance}` : "",
    order.deliveryFloor ? `Этаж: ${order.deliveryFloor}` : "",
    order.deliveryApartment ? `Кв./офис: ${order.deliveryApartment}` : "",
    mapUrl ? `Карта: ${mapUrl}` : "",
    customerUrl ? `WhatsApp клиенту: ${customerUrl}` : "",
  ]
    .filter(Boolean)
    .join("\n");
}

export async function handleNewDeliveryOrder(order: DeliveryOrderForManager) {
  await notifyWaiters(formatOrderMessage(order));
  await notifyDelivery(formatDriverDeliveryMessage(order));
  await sendWhatsappText(order.customerPhone || "", formatCustomerDeliveryMessage(order));
}
