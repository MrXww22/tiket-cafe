"use client";

import { BellRing, Check, Clock3, Flame, History, RefreshCcw, RotateCcw, Volume2, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { formatMoney } from "@/lib/money";
import { getOrderPlaceLabel } from "@/lib/orders";
import type { Department, DepartmentNotification, ItemStatus, Order } from "@/types/app";

type Tab = "active" | "history";
type AudioWindow = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext };

const departmentTitle: Record<Department, string> = {
  KITCHEN: "Кухня",
  BAR: "Бар",
};

const itemStatusLabel: Record<ItemStatus, string> = {
  NEW: "Новый",
  COOKING: "Готовится",
  READY: "Готов",
};

const itemStatusClass: Record<ItemStatus, string> = {
  NEW: "border-zinc-200 bg-zinc-50 text-zinc-700",
  COOKING: "border-amber-200 bg-amber-50 text-amber-700",
  READY: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

function filterDepartmentOrders(orders: Order[], department: Department) {
  return orders
    .map((order) => ({
      ...order,
      items: order.items.filter((item) => item.product.department === department),
    }))
    .filter((order) => order.items.length);
}

export function Workstation({ department }: { department: Department }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [notifications, setNotifications] = useState<DepartmentNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("active");
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
      [0, 0.16, 0.32].forEach((offset) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.type = "triangle";
        oscillator.frequency.setValueAtTime(740, startedAt + offset);
        gain.gain.setValueAtTime(0.001, startedAt + offset);
        gain.gain.exponentialRampToValueAtTime(0.22, startedAt + offset + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, startedAt + offset + 0.12);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start(startedAt + offset);
        oscillator.stop(startedAt + offset + 0.13);
      });
    } catch {
      setSoundBlocked(true);
    }
  };

  const showSystemNotification = async (notification: DepartmentNotification) => {
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
    const response = await fetch("/api/orders", { cache: "no-store" });
    const data = (await response.json()) as Order[];
    setOrders(data);
    setLoading(false);
  };

  const loadNotifications = async () => {
    const response = await fetch(`/api/department-notifications?department=${department}`, { cache: "no-store" });
    if (!response.ok) return;

    const nextNotifications = (await response.json()) as DepartmentNotification[];
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
  }, [department]);

  const departmentOrders = useMemo(() => filterDepartmentOrders(orders, department), [orders, department]);
  const activeOrders = departmentOrders.filter((order) => !["SERVED", "CANCELED"].includes(order.status));
  const historyOrders = departmentOrders.filter((order) => ["SERVED", "CANCELED"].includes(order.status));
  const visibleOrders = tab === "active" ? activeOrders : historyOrders;

  const setStatus = async (id: string, status: ItemStatus) => {
    await fetch(`/api/order-items/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const callWaiter = async (tableNumber: number) => {
    await fetch("/api/waiter-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableNumber, source: department }),
    });
  };

  const dismissNotification = async (notification: DepartmentNotification) => {
    setNotifications((current) => current.filter((item) => item.id !== notification.id));
    await fetch("/api/department-notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [notification.id] }),
    });
  };

  return (
    <section className="surface rounded-lg p-4">
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

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black">{departmentTitle[department]}</h1>
          <p className="text-sm text-zinc-600">Позиции этого цеха со статусами приготовления.</p>
        </div>
        <button className="btn btn-secondary" onClick={load}>
          <RefreshCcw size={18} /> Обновить
        </button>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        <button className={tab === "active" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setTab("active")}>
          <Clock3 size={18} /> Активные
        </button>
        <button className={tab === "history" ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setTab("history")}>
          <History size={18} /> История
        </button>
      </div>

      {loading ? <p className="text-zinc-600">Загрузка...</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        {visibleOrders.map((order) => (
          <article key={order.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-lg font-black">{getOrderPlaceLabel(order)}</p>
                <p className="text-sm text-zinc-600">
                  Заказ #{order.number} · {order.status}
                </p>
                {order.orderType === "DELIVERY" ? <p className="text-sm font-bold text-teal-800">{order.deliveryAddress}</p> : null}
              </div>
              {tab === "active" && order.table?.number ? (
                <button className="btn btn-secondary text-sm" onClick={() => callWaiter(order.table!.number)}>
                  <BellRing size={18} /> Официант
                </button>
              ) : null}
            </div>
            <div className="grid gap-3">
              {order.items.map((item) => (
                <div key={item.id} className="rounded-lg bg-zinc-50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-black">{item.product.name}</p>
                      <p className="text-sm text-zinc-600">
                        x{item.quantity} · {formatMoney(item.price * item.quantity)}
                      </p>
                    </div>
                    <span className={`chip ${itemStatusClass[item.status]}`}>{itemStatusLabel[item.status]}</span>
                  </div>
                  {tab === "active" ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <button className="btn btn-secondary" onClick={() => setStatus(item.id, "COOKING")}>
                        <Flame size={18} /> Готовится
                      </button>
                      <button className="btn btn-primary" onClick={() => setStatus(item.id, "READY")}>
                        <Check size={18} /> Готов
                      </button>
                      <button className="btn btn-secondary" onClick={() => setStatus(item.id, "NEW")}>
                        <RotateCcw size={18} /> Вернуть
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </article>
        ))}
      </div>

      {!loading && !visibleOrders.length ? (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
          {tab === "active" ? "Активных позиций нет." : "История пока пустая."}
        </div>
      ) : null}
    </section>
  );
}
