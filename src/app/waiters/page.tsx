"use client";

import { AlertTriangle, BellRing, CheckCircle, ClipboardList, RefreshCcw, Table2, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { formatMoney } from "@/lib/money";
import { getOrderPlaceLabel } from "@/lib/orders";
import type { DiningTable, Order, PaymentMethod, TableStatus, WaiterNotification } from "@/types/app";

type Tab = "tables" | "orders";
type TableFilter = "all" | TableStatus;
type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const tableLabels: Record<TableStatus, string> = {
  FREE: "Свободен",
  BUSY: "Занят",
  RESERVED: "Бронь",
  CLEANING: "Уборка",
};

const tableStatusClass: Record<TableStatus, string> = {
  FREE: "border-emerald-200 bg-emerald-50 text-emerald-700",
  BUSY: "border-red-200 bg-red-50 text-red-700",
  RESERVED: "border-amber-200 bg-amber-50 text-amber-700",
  CLEANING: "border-sky-200 bg-sky-50 text-sky-700",
};

const paymentLabels: Record<PaymentMethod, string> = {
  CASH: "Наличные",
  CARD: "Карта",
  TRANSFER: "Перевод",
};

function orderTotal(order: Order) {
  return order.totalAmount || order.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function WaiterWorkspace() {
  const [tab, setTab] = useState<Tab>("tables");
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<WaiterNotification[]>([]);
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [closingOrderId, setClosingOrderId] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("CASH");
  const [soundBlocked, setSoundBlocked] = useState(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const seenNotificationIdsRef = useRef<Set<string>>(new Set());

  const unlockSound = async () => {
    try {
      const AudioContextClass = window.AudioContext || (window as AudioWindow).webkitAudioContext;
      if (!AudioContextClass) {
        setSoundBlocked(true);
        return;
      }
      audioContextRef.current ??= new AudioContextClass();
      await audioContextRef.current.resume();
      setSoundBlocked(false);
    } catch {
      setSoundBlocked(true);
    }
  };

  const playNotificationSound = async () => {
    try {
      await unlockSound();
      const context = audioContextRef.current;
      if (!context) return;

      const startedAt = context.currentTime;
      [0, 0.18].forEach((offset) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "sine";
        oscillator.frequency.setValueAtTime(880, startedAt + offset);
        gain.gain.setValueAtTime(0.001, startedAt + offset);
        gain.gain.exponentialRampToValueAtTime(0.28, startedAt + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startedAt + offset + 0.14);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startedAt + offset);
        oscillator.stop(startedAt + offset + 0.15);
      });
    } catch {
      setSoundBlocked(true);
    }
  };

  const showSystemNotification = async (notification: WaiterNotification) => {
    if (!("Notification" in window)) return;

    if (Notification.permission === "default") {
      await Notification.requestPermission();
    }

    if (Notification.permission === "granted") {
      new Notification(notification.title, {
        body: notification.message,
        tag: notification.id,
      });
    }
  };

  const load = async () => {
    const [tablesResponse, ordersResponse] = await Promise.all([
      fetch("/api/tables", { cache: "no-store" }),
      fetch("/api/orders", { cache: "no-store" }),
    ]);
    setTables((await tablesResponse.json()) as DiningTable[]);
    setOrders((await ordersResponse.json()) as Order[]);
  };

  const loadNotifications = async () => {
    const response = await fetch("/api/waiter-notifications", { cache: "no-store" });
    if (!response.ok) return;

    const nextNotifications = (await response.json()) as WaiterNotification[];
    const freshNotifications = nextNotifications.filter((notification) => !seenNotificationIdsRef.current.has(notification.id));
    freshNotifications.forEach((notification) => seenNotificationIdsRef.current.add(notification.id));
    setNotifications(nextNotifications);

    if (freshNotifications.length) {
      await playNotificationSound();
      await showSystemNotification(freshNotifications[0]);
    }
  };

  useEffect(() => {
    const activateSound = () => {
      void unlockSound();
    };
    window.addEventListener("pointerdown", activateSound, { once: true });

    const initialTimer = window.setTimeout(() => {
      void load();
      void loadNotifications();
    }, 0);
    const timer = window.setInterval(() => {
      void load();
      void loadNotifications();
    }, 5000);
    return () => {
      window.removeEventListener("pointerdown", activateSound);
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, []);

  const filteredTables = useMemo(
    () => tables.filter((table) => tableFilter === "all" || table.status === tableFilter),
    [tableFilter, tables],
  );

  const cleaningTables = tables.filter((table) => table.status === "CLEANING");
  const activeOrders = orders.filter((order) => !["SERVED", "CANCELED"].includes(order.status));

  const setTableStatus = async (table: DiningTable, status: TableStatus) => {
    await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const closeOrder = async (order: Order) => {
    await fetch(`/api/orders/${order.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "SERVED", paymentMethod }),
    });
    setClosingOrderId(null);
    setPaymentMethod("CASH");
    await load();
  };

  const dismissNotification = async (notification: WaiterNotification) => {
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    await fetch("/api/waiter-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [notification.id] }),
    });
  };

  return (
    <section className="grid gap-5">
      {notifications.length ? (
        <div className="fixed right-4 top-4 z-50 grid w-[min(420px,calc(100vw-32px))] gap-3">
          {notifications.slice(0, 3).map((notification) => (
            <div key={notification.id} className="rounded-lg border-2 border-red-500 bg-white p-4 shadow-2xl">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="flex items-center gap-2 text-lg font-black text-red-700">
                    <BellRing size={20} /> {notification.title}
                  </p>
                  <p className="mt-1 font-bold text-zinc-900">{notification.message}</p>
                  <p className="mt-1 text-xs text-zinc-500">{notification.tableNumber ? `Столик ${notification.tableNumber}` : "Доставка"}</p>
                </div>
                <button className="btn btn-secondary px-3" onClick={() => dismissNotification(notification)} aria-label="Закрыть уведомление">
                  <X size={18} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {soundBlocked ? (
        <button className="btn btn-primary fixed bottom-4 right-4 z-50 shadow-2xl" onClick={unlockSound}>
          <Volume2 size={18} /> Включить звук
        </button>
      ) : null}

      {cleaningTables.length ? (
        <div className="surface rounded-lg border-2 border-sky-500 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-xl font-black text-sky-800">
            <AlertTriangle size={22} /> Нужно убрать столики
          </h2>
          <div className="flex flex-wrap gap-2">
            {cleaningTables.map((table) => (
              <span key={table.id} className="chip border-sky-200 bg-sky-50 text-sky-700">
                Столик {table.number}
              </span>
            ))}
          </div>
          <p className="mt-2 text-sm text-zinc-600">После закрытия заказа столик станет свободным автоматически по времени уборки из админки.</p>
        </div>
      ) : null}

      <div className="surface rounded-lg p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">Рабочее место официанта</h1>
            <p className="text-sm text-zinc-600">Столики, статусы, активные заказы и закрытие оплаты.</p>
          </div>
          <button className="btn btn-secondary" onClick={load}>
            <RefreshCcw size={18} /> Обновить
          </button>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <button className={tab === "tables" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setTab("tables")}>
            <Table2 size={18} /> Столики
          </button>
          <button className={tab === "orders" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setTab("orders")}>
            <ClipboardList size={18} /> Заказы
          </button>
        </div>
      </div>

      {tab === "tables" ? (
        <div className="surface rounded-lg p-4">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="grid gap-1 text-sm font-bold text-zinc-700">
              Фильтр столиков
              <select className="control" value={tableFilter} onChange={(event) => setTableFilter(event.target.value as TableFilter)}>
                <option value="all">Все столики</option>
                <option value="FREE">Только свободные</option>
                <option value="RESERVED">Только бронь</option>
                <option value="BUSY">Только занятые</option>
                <option value="CLEANING">Только уборка</option>
              </select>
            </label>
            <button className="btn btn-secondary self-end" onClick={() => setTableFilter("all")}>
              Сбросить
            </button>
          </div>

          <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
            <div className="hidden grid-cols-[120px_130px_1fr] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-600 md:grid">
              <span>Столик</span>
              <span>Статус</span>
              <span>Действия</span>
            </div>
            <div className="divide-y divide-zinc-200">
              {filteredTables.map((table) => (
                <article key={table.id} className="grid gap-3 px-4 py-4 md:grid-cols-[120px_130px_1fr] md:items-center">
                  <div>
                    <p className="text-lg font-black">#{table.number}</p>
                    <p className="text-sm text-zinc-600">Мест: {table.seats}</p>
                  </div>
                  <span className={`chip w-fit ${tableStatusClass[table.status]}`}>{tableLabels[table.status]}</span>
                  <div className="flex flex-wrap gap-2 md:justify-end">
                    <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "FREE")}>
                      Свободен
                    </button>
                    <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "RESERVED")}>
                      Бронь
                    </button>
                    <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "BUSY")}>
                      Занят
                    </button>
                    <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "CLEANING")}>
                      Уборка
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="surface rounded-lg p-4">
          <h2 className="mb-4 text-2xl font-black">Активные заказы</h2>
          <div className="grid gap-4">
            {activeOrders.map((order) => {
              const isClosing = closingOrderId === order.id;
              return (
                <article key={order.id} className="rounded-lg border border-zinc-200 bg-white p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-lg font-black">{getOrderPlaceLabel(order)}</p>
                      <p className="text-sm text-zinc-600">
                        Заказ #{order.number} · {order.status}
                      </p>
                      {order.orderType === "DELIVERY" ? <p className="text-sm font-bold text-teal-800">{order.deliveryAddress}</p> : null}
                    </div>
                    <span className="chip">{formatMoney(orderTotal(order))}</span>
                  </div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {order.items.map((item) => (
                      <div key={item.id} className="rounded-lg bg-zinc-50 p-3">
                        <div className="flex items-center justify-between gap-3">
                          <span className="font-bold">
                            {item.product.name} x{item.quantity}
                          </span>
                          <span className="chip">{item.status}</span>
                        </div>
                        <p className="text-sm text-zinc-600">{item.product.department === "KITCHEN" ? "Кухня" : "Бар"}</p>
                      </div>
                    ))}
                  </div>

                  {isClosing ? (
                    <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4">
                      <p className="font-black">Сумма к закрытию: {formatMoney(orderTotal(order))}</p>
                      <p className="mt-1 text-sm font-bold text-zinc-700">
                        Процент официанта: {order.waiterPercent}% · {formatMoney(order.waiterAmount)}
                      </p>
                      <label className="mt-3 grid gap-1 text-sm font-bold text-zinc-700">
                        Способ оплаты
                        <select className="control bg-white" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}>
                          {Object.entries(paymentLabels).map(([method, label]) => (
                            <option key={method} value={method}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <p className="mt-2 text-sm text-zinc-700">После закрытия столик перейдет в статус “Уборка” на время, указанное в админке.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button className="btn btn-primary" onClick={() => closeOrder(order)}>
                          <CheckCircle size={18} /> Закрыть заказ
                        </button>
                        <button className="btn btn-secondary" onClick={() => setClosingOrderId(null)}>
                          <X size={18} /> Отмена
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button className="btn btn-primary mt-4" onClick={() => setClosingOrderId(order.id)}>
                      <CheckCircle size={18} /> Закрыть заказ
                    </button>
                  )}
                </article>
              );
            })}
          </div>
          {!activeOrders.length ? <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">Активных заказов нет.</div> : null}
        </div>
      )}
    </section>
  );
}

export default function WaitersPage() {
  return (
    <AppShell title="Панель официантов">
      <AuthGate allowed={["ADMIN", "WAITER"]}>
        <WaiterWorkspace />
      </AuthGate>
    </AppShell>
  );
}
