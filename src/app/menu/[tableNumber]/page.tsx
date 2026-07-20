"use client";

import { BellRing, Languages, Minus, Plus, Search, Send, ShoppingCart, Star } from "lucide-react";
import { use, useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { CustomerReview, OrderStatus, Product } from "@/types/app";

type Params = {
  params: Promise<{ tableNumber: string }>;
};

type Language = "ru" | "ky";
type MenuOrder = {
  id: string;
  number: number;
  status: OrderStatus;
  totalAmount: number;
  review?: CustomerReview | null;
  items: Array<{
    id: string;
    quantity: number;
    price: number;
    status: "NEW" | "COOKING" | "READY";
    product: Product;
  }>;
};

const labels = {
  ru: {
    chooseLanguage: "Выберите язык",
    russian: "Русский",
    kyrgyz: "Кыргызский",
    table: "Столик",
    menuTitle: "Электронное меню",
    waiterCalled: "Официант вызван. Сообщение отправлено.",
    orderSent: "Заказ отправлен. Ниже можно отслеживать его статус.",
    menu: "Меню",
    kitchen: "Кухня",
    bar: "Бар",
    callWaiter: "Позвать официанта",
    order: "Заказ",
    comment: "Комментарий к заказу",
    total: "Итого",
    sendOrder: "Отправить заказ",
    decrease: "Уменьшить",
    add: "Добавить",
    allCategories: "Все",
    categoryFilter: "Категории",
    search: "Поиск блюда",
    searchPlaceholder: "Например, салат или лимонад",
    invalidQr: "QR-код недействителен. Попросите официанта обновить QR-код.",
    loadingMenu: "Меню загружается...",
    menuError: "Не удалось загрузить меню. Обновите страницу.",
    emptyMenu: "По выбранным фильтрам блюд нет.",
    myOrders: "Мои заказы",
    noOrders: "Активных заказов пока нет.",
    reviewTitle: "Оцените обслуживание",
    reviewComment: "Комментарий по обслуживанию",
    sendReview: "Оставить отзыв",
    reviewThanks: "Спасибо за отзыв",
  },
  ky: {
    chooseLanguage: "Тилди тандаңыз",
    russian: "Орусча",
    kyrgyz: "Кыргызча",
    table: "Стол",
    menuTitle: "Электрондук меню",
    waiterCalled: "Официант чакырылды. Билдирүү жөнөтүлдү.",
    orderSent: "Буйрутма жөнөтүлдү. Статусун төмөндөн көрө аласыз.",
    menu: "Меню",
    kitchen: "Ашкана",
    bar: "Бар",
    callWaiter: "Официантты чакыруу",
    order: "Буйрутма",
    comment: "Буйрутмага комментарий",
    total: "Жалпы",
    sendOrder: "Буйрутманы жөнөтүү",
    decrease: "Азайтуу",
    add: "Кошуу",
    allCategories: "Баары",
    categoryFilter: "Категориялар",
    search: "Тамак издөө",
    searchPlaceholder: "Мисалы, салат же лимонад",
    invalidQr: "QR-код жараксыз. Официанттан QR-кодду жаңыртууну сураныңыз.",
    loadingMenu: "Меню жүктөлүүдө...",
    menuError: "Меню жүктөлгөн жок. Баракты жаңыртыңыз.",
    emptyMenu: "Тандалган фильтр боюнча тамак жок.",
    myOrders: "Менин буйрутмаларым",
    noOrders: "Азырынча активдүү буйрутма жок.",
    reviewTitle: "Кызматты баалаңыз",
    reviewComment: "Кызмат боюнча комментарий",
    sendReview: "Пикир калтыруу",
    reviewThanks: "Пикириңиз үчүн рахмат",
  },
};

const statusLabels: Record<Language, Record<OrderStatus, string>> = {
  ru: {
    NEW: "Принят",
    IN_PROGRESS: "Готовится",
    READY: "Готов, официант скоро принесет",
    SERVED: "Закрыт",
    CANCELED: "Отменен",
  },
  ky: {
    NEW: "Кабыл алынды",
    IN_PROGRESS: "Даярдалып жатат",
    READY: "Даяр, официант жакында алып келет",
    SERVED: "Жабылды",
    CANCELED: "Жокко чыгарылды",
  },
};

export default function MenuPage({ params }: Params) {
  const { tableNumber: tableToken } = use(params);
  const [language, setLanguage] = useState<Language | null>(null);
  const [tableNumber, setTableNumber] = useState<number | null>(null);
  const [tableError, setTableError] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<MenuOrder[]>([]);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [comment, setComment] = useState("");
  const [sent, setSent] = useState(false);
  const [waiterCalled, setWaiterCalled] = useState(false);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [reviewRating, setReviewRating] = useState<Record<string, number>>({});
  const [reviewComment, setReviewComment] = useState<Record<string, string>>({});
  const [reviewSent, setReviewSent] = useState<Record<string, boolean>>({});

  const text = labels[language || "ru"];
  const currentLanguage = language || "ru";

  const loadOrders = async () => {
    if (tableError) return;
    const response = await fetch(`/api/orders/table/${encodeURIComponent(tableToken)}`, { cache: "no-store" });
    if (response.ok) setOrders((await response.json()) as MenuOrder[]);
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const savedLanguage = window.localStorage.getItem(`table-language-${tableToken}`);
        if (savedLanguage === "ru" || savedLanguage === "ky") setLanguage(savedLanguage);
      } catch {
        setLanguage(null);
      }
    }, 0);

    fetch(`/api/menu-table/${encodeURIComponent(tableToken)}`, { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("table");
        return response.json();
      })
      .then((data: { number: number }) => {
        setTableNumber(data.number);
        setTableError("");
      })
      .catch(() => setTableError("invalid"));

    fetch("/api/products", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("products");
        return response.json();
      })
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProductsError(text.menuError))
      .finally(() => setProductsLoading(false));

    return () => window.clearTimeout(timer);
  }, [tableToken]);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadOrders(), 0);
    const interval = window.setInterval(() => void loadOrders(), 5000);
    return () => {
      window.clearTimeout(timer);
      window.clearInterval(interval);
    };
  }, [tableToken, tableError]);

  const selectLanguage = (nextLanguage: Language) => {
    setLanguage(nextLanguage);
    try {
      window.localStorage.setItem(`table-language-${tableToken}`, nextLanguage);
    } catch {
      // localStorage can be unavailable in some private mobile browsers.
    }
  };

  const availableProducts = products.filter((product) => !product.isPaused);
  const categories = Array.from(new Set(availableProducts.map((product) => product.category?.name || text.menu)));
  const filteredProducts = availableProducts.filter((product) => {
    const categoryName = product.category?.name || text.menu;
    const categoryMatches = categoryFilter === "all" || categoryName === categoryFilter;
    const query = search.trim().toLowerCase();
    const searchMatches = !query || `${product.name} ${product.description}`.toLowerCase().includes(query);
    return categoryMatches && searchMatches;
  });
  const grouped = filteredProducts.reduce<Record<string, Product[]>>((acc, product) => {
    const key = product.category?.name || text.menu;
    acc[key] = [...(acc[key] || []), product];
    return acc;
  }, {});

  const total = useMemo(
    () =>
      Object.entries(cart).reduce((sum, [productId, quantity]) => {
        const product = products.find((candidate) => candidate.id === productId);
        return sum + (product?.price || 0) * quantity;
      }, 0),
    [cart, products],
  );

  const changeQuantity = (id: string, diff: number) => {
    setCart((current) => {
      const next = Math.max((current[id] || 0) + diff, 0);
      const updated = { ...current, [id]: next };
      if (!next) delete updated[id];
      return updated;
    });
  };

  const submitOrder = async () => {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    if (!items.length || !tableNumber || tableError) return;

    const response = await fetch("/api/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableToken, comment, items }),
    });

    if (response.ok) {
      setCart({});
      setComment("");
      setSent(true);
      await loadOrders();
    }
  };

  const callWaiter = async () => {
    if (!tableNumber || tableError) return;
    await fetch("/api/waiter-call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tableToken }),
    });
    setWaiterCalled(true);
    window.setTimeout(() => setWaiterCalled(false), 5000);
  };

  const submitReview = async (orderId: string) => {
    const rating = reviewRating[orderId] || 5;
    const response = await fetch("/api/reviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId, rating, comment: reviewComment[orderId] || "" }),
    });

    if (response.ok) {
      setReviewSent((current) => ({ ...current, [orderId]: true }));
      await loadOrders();
    }
  };

  if (!language) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4 py-5">
        <section className="surface w-full max-w-md rounded-lg p-5">
          <div className="mb-5 flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Languages size={22} />
            </span>
            <div>
              <p className="text-sm font-bold text-teal-800">{tableNumber ? `Столик ${tableNumber}` : "QR меню"}</p>
              <h1 className="text-2xl font-black">Выберите язык</h1>
              <p className="text-sm font-bold text-zinc-600">Тилди тандаңыз</p>
            </div>
          </div>

          <div className="grid gap-3">
            <button className="btn btn-primary w-full" onClick={() => selectLanguage("ru")}>
              Русский
            </button>
            <button className="btn btn-secondary w-full" onClick={() => selectLanguage("ky")}>
              Кыргызча
            </button>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen px-4 py-5">
      <div className="mx-auto max-w-6xl">
        {tableError ? <div className="surface mb-5 rounded-lg border-2 border-red-300 p-6 text-center font-bold text-red-700">{text.invalidQr}</div> : null}

        <header className="mb-5 rounded-lg bg-white/90 p-4 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-teal-800">
                {text.table} {tableNumber || "..."}
              </p>
              <h1 className="text-3xl font-black">{text.menuTitle}</h1>
            </div>
            <div className="flex gap-2">
              <button className={language === "ru" ? "btn btn-primary text-sm" : "btn btn-secondary text-sm"} onClick={() => selectLanguage("ru")}>
                RU
              </button>
              <button className={language === "ky" ? "btn btn-primary text-sm" : "btn btn-secondary text-sm"} onClick={() => selectLanguage("ky")}>
                KG
              </button>
            </div>
          </div>
        </header>

        {sent ? <div className="surface mb-5 rounded-lg p-4 font-bold text-teal-800">{text.orderSent}</div> : null}
        {waiterCalled ? <div className="surface mb-5 rounded-lg p-4 font-bold text-teal-800">{text.waiterCalled}</div> : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
          <section className="grid gap-5">
            <div className="surface rounded-lg p-3">
              <label className="mb-3 grid gap-1 text-sm font-bold text-zinc-700">
                {text.search}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input className="control w-full pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder={text.searchPlaceholder} />
                </div>
              </label>
              <p className="mb-2 text-sm font-black text-zinc-700">{text.categoryFilter}</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button className={categoryFilter === "all" ? "btn btn-primary shrink-0 text-sm" : "btn btn-secondary shrink-0 text-sm"} onClick={() => setCategoryFilter("all")}>
                  {text.allCategories}
                </button>
                {categories.map((category) => (
                  <button key={category} className={categoryFilter === category ? "btn btn-primary shrink-0 text-sm" : "btn btn-secondary shrink-0 text-sm"} onClick={() => setCategoryFilter(category)}>
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {productsLoading ? <div className="surface rounded-lg p-6 text-center font-bold text-zinc-600">{text.loadingMenu}</div> : null}
            {productsError ? <div className="surface rounded-lg border-2 border-red-300 p-6 text-center font-bold text-red-700">{productsError}</div> : null}

            {Object.entries(grouped).map(([category, categoryProducts]) => (
              <div key={category} className="surface rounded-lg p-4">
                <h2 className="mb-4 text-xl font-black">{category}</h2>
                <div className="grid gap-3 md:grid-cols-2">
                  {categoryProducts.map((product) => (
                    <article key={product.id} className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
                      {product.imageUrl ? <img className="h-40 w-full object-cover" src={product.imageUrl} alt="" /> : <div className="h-28 bg-zinc-100" />}
                      <div className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black">{product.name}</p>
                            <p className="text-sm text-zinc-600">{product.department === "KITCHEN" ? text.kitchen : text.bar}</p>
                          </div>
                          <span className="chip">{formatMoney(product.price)}</span>
                        </div>
                        <p className="mt-2 min-h-10 text-sm text-zinc-600">{product.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <button className="btn btn-secondary" onClick={() => changeQuantity(product.id, -1)} aria-label={text.decrease}>
                            <Minus size={18} />
                          </button>
                          <span className="text-lg font-black">{cart[product.id] || 0}</span>
                          <button className="btn btn-primary" onClick={() => changeQuantity(product.id, 1)} aria-label={text.add}>
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}

            {!productsLoading && !productsError && !Object.keys(grouped).length ? (
              <div className="surface rounded-lg p-6 text-center font-bold text-zinc-600">{text.emptyMenu}</div>
            ) : null}
          </section>

          <aside className="grid h-fit gap-4 lg:sticky lg:top-5">
            <div className="surface rounded-lg p-4">
              <button className="btn btn-secondary mb-4 w-full" onClick={callWaiter}>
                <BellRing size={18} /> {text.callWaiter}
              </button>
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart size={20} />
                <h2 className="text-xl font-black">{text.order}</h2>
              </div>
              <div className="grid gap-2">
                {Object.entries(cart).map(([productId, quantity]) => {
                  const product = products.find((candidate) => candidate.id === productId);
                  if (!product) return null;
                  return (
                    <div key={productId} className="flex items-center justify-between gap-3 text-sm">
                      <span>
                        {product.name} x{quantity}
                      </span>
                      <b>{formatMoney(product.price * quantity)}</b>
                    </div>
                  );
                })}
              </div>
              <textarea className="control mt-4 min-h-24 w-full" value={comment} onChange={(event) => setComment(event.target.value)} placeholder={text.comment} />
              <div className="my-4 flex items-center justify-between text-lg font-black">
                <span>{text.total}</span>
                <span>{formatMoney(total)}</span>
              </div>
              <button className="btn btn-primary w-full" onClick={submitOrder} disabled={!total || !tableNumber || Boolean(tableError)}>
                <Send size={18} /> {text.sendOrder}
              </button>
            </div>

            <div className="surface rounded-lg p-4">
              <h2 className="mb-3 text-xl font-black">{text.myOrders}</h2>
              <div className="grid gap-3">
                {orders.map((order) => (
                  <article key={order.id} className="rounded-lg border border-zinc-200 bg-white p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-black">#{order.number}</p>
                        <p className="text-sm font-bold text-teal-800">{statusLabels[currentLanguage][order.status]}</p>
                      </div>
                      <span className="chip">{formatMoney(order.totalAmount)}</span>
                    </div>
                    <div className="mt-2 grid gap-1 text-sm text-zinc-600">
                      {order.items.map((item) => (
                        <span key={item.id}>
                          {item.product.name} x{item.quantity}
                        </span>
                      ))}
                    </div>
                    {order.status === "SERVED" ? (
                      <div className="mt-3 rounded-lg bg-zinc-50 p-3">
                        {order.review || reviewSent[order.id] ? (
                          <p className="font-bold text-emerald-700">{text.reviewThanks}</p>
                        ) : (
                          <div className="grid gap-2">
                            <p className="font-black">{text.reviewTitle}</p>
                            <div className="flex gap-1">
                              {[1, 2, 3, 4, 5].map((rating) => (
                                <button key={rating} className="p-1 text-amber-500" onClick={() => setReviewRating((current) => ({ ...current, [order.id]: rating }))} aria-label={`${rating}`}>
                                  <Star size={22} fill={rating <= (reviewRating[order.id] || 5) ? "currentColor" : "none"} />
                                </button>
                              ))}
                            </div>
                            <textarea
                              className="control min-h-20 w-full"
                              value={reviewComment[order.id] || ""}
                              onChange={(event) => setReviewComment((current) => ({ ...current, [order.id]: event.target.value }))}
                              placeholder={text.reviewComment}
                            />
                            <button className="btn btn-primary w-full" onClick={() => submitReview(order.id)}>
                              {text.sendReview}
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
              {!orders.length ? <p className="text-sm text-zinc-600">{text.noOrders}</p> : null}
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
