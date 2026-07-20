import { Bot } from "grammy";

const token = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_WAITER_CHAT_ID;

export async function notifyWaiters(text: string) {
  if (!token || !chatId) {
    console.log("[telegram skipped]", text);
    return;
  }

  const bot = new Bot(token);
  await bot.api.sendMessage(chatId, text);
}
