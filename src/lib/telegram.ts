import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_WAITER_CHAT_ID;
const deliveryChatId = process.env.TELEGRAM_DELIVERY_CHAT_ID;

async function notifyTelegram(text: string, targetChatId: string | undefined) {
  if (!token || !targetChatId) {
    console.log("[telegram skipped]", text);
    return;
  }

  const bot = new Bot(token);
  await bot.api.sendMessage(targetChatId, text);
}

export async function notifyWaiters(text: string) {
  await notifyTelegram(text, chatId);
}

export async function notifyDelivery(text: string) {
  await notifyTelegram(text, deliveryChatId || chatId);
}
