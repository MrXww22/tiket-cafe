# TableFlow

MVP для кафе и ресторанов: QR-меню для гостей, админка товаров и столиков, панели кухни/бара, экран официантов и Telegram-уведомления.

## Запуск локально

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Приложение откроется на `http://localhost:3000`.

## PostgreSQL

Создай базу:

```bash
createdb cafe_menu
```

И проверь `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/cafe_menu?schema=public"
```

## Telegram

В `.env` заполни:

```env
NEXT_PUBLIC_APP_URL="https://your-domain.ru"
TELEGRAM_BOT_TOKEN="токен_бота"
TELEGRAM_WAITER_CHAT_ID="-100id_группы"
```

Если переменные пустые, уведомления не отправляются в Telegram, а пишутся в консоль сервера.

`NEXT_PUBLIC_APP_URL` нужен для QR-кодов. Например, QR столика 7 будет вести на `https://your-domain.ru/menu/7`.

## Экраны

- `/admin` - товары, категории, стоп-лист, столики.
- `/menu/1` - QR-меню для столика 1. Для каждого столика используется свой номер: `/menu/2`, `/menu/3` и так далее.
- `/api/qr/table/1` - PNG QR-код для столика 1.
- `/kitchen` - панель кухни.
- `/bar` - панель бара.
- `/waiters` - панель официантов и статусы столиков.
