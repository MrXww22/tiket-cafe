"use client";

import { LocateFixed, Minus, Plus, Search, Send, ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { formatMoney } from "@/lib/money";
import type { Product } from "@/types/app";

type DeliveryOrderResponse = {
  id: string;
  number: number;
  totalAmount: number;
};

const emptyCustomer = {
  customerName: "",
  customerPhone: "",
  deliveryAddress: "",
  deliveryEntrance: "",
  deliveryFloor: "",
  deliveryApartment: "",
  comment: "",
};

export default function DeliveryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [productsLoading, setProductsLoading] = useState(true);
  const [productsError, setProductsError] = useState("");
  const [cart, setCart] = useState<Record<string, number>>({});
  const [customer, setCustomer] = useState(emptyCustomer);
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const [sending, setSending] = useState(false);
  const [sentOrder, setSentOrder] = useState<DeliveryOrderResponse | null>(null);
  const [submitError, setSubmitError] = useState("");

  useEffect(() => {
    fetch("/api/products", { cache: "no-store" })
      .then((response) => {
        if (!response.ok) throw new Error("products");
        return response.json();
      })
      .then((data: Product[]) => setProducts(data))
      .catch(() => setProductsError("Не удалось загрузить меню. Обновите страницу."))
      .finally(() => setProductsLoading(false));
  }, []);

  const availableProducts = products.filter((product) => !product.isPaused);
  const categories = Array.from(new Set(availableProducts.map((product) => product.category?.name || "Меню")));
  const filteredProducts = availableProducts.filter((product) => {
    const categoryName = product.category?.name || "Меню";
    const categoryMatches = categoryFilter === "all" || categoryName === categoryFilter;
    const query = search.trim().toLowerCase();
    const searchMatches = !query || `${product.name} ${product.description}`.toLowerCase().includes(query);
    return categoryMatches && searchMatches;
  });
  const grouped = filteredProducts.reduce<Record<string, Product[]>>((acc, product) => {
    const key = product.category?.name || "Меню";
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

  const detectLocation = () => {
    setLocationStatus("");
    if (!navigator.geolocation) {
      setLocationStatus("Геолокация не поддерживается браузером.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setLocationStatus("Геолокация добавлена к заказу.");
      },
      () => setLocationStatus("Не удалось получить геолокацию. Можно оставить только адрес."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  const submitOrder = async () => {
    const items = Object.entries(cart).map(([productId, quantity]) => ({ productId, quantity }));
    if (!items.length || sending) return;

    setSending(true);
    setSubmitError("");
    const response = await fetch("/api/delivery/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...customer,
        deliveryLat: location?.lat,
        deliveryLng: location?.lng,
        items,
      }),
    });

    const data = (await response.json().catch(() => ({}))) as DeliveryOrderResponse & { message?: string };
    setSending(false);

    if (!response.ok) {
      setSubmitError(data.message || "Не удалось отправить заказ.");
      return;
    }

    setCart({});
    setCustomer(emptyCustomer);
    setLocation(null);
    setSentOrder(data);
  };

  return (
    <main className="min-h-screen px-4 py-5">
      <div className="mx-auto max-w-6xl">
        <header className="mb-5 rounded-lg bg-white/90 p-4 shadow-sm">
          <p className="text-sm font-bold text-teal-800">Доставка</p>
          <h1 className="text-3xl font-black">Заказ с доставкой</h1>
        </header>

        {sentOrder ? (
          <div className="surface mb-5 rounded-lg p-4 font-bold text-teal-800">
            Заказ #{sentOrder.number} принят. Менеджер отправит уведомление в WhatsApp и передаст адрес доставщику.
          </div>
        ) : null}

        <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
          <section className="grid gap-5">
            <div className="surface rounded-lg p-3">
              <label className="mb-3 grid gap-1 text-sm font-bold text-zinc-700">
                Поиск блюда
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" size={18} />
                  <input className="control w-full pl-10" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Например, салат или лимонад" />
                </div>
              </label>
              <p className="mb-2 text-sm font-black text-zinc-700">Категории</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                <button className={categoryFilter === "all" ? "btn btn-primary shrink-0 text-sm" : "btn btn-secondary shrink-0 text-sm"} onClick={() => setCategoryFilter("all")}>
                  Все
                </button>
                {categories.map((category) => (
                  <button key={category} className={categoryFilter === category ? "btn btn-primary shrink-0 text-sm" : "btn btn-secondary shrink-0 text-sm"} onClick={() => setCategoryFilter(category)}>
                    {category}
                  </button>
                ))}
              </div>
            </div>

            {productsLoading ? <div className="surface rounded-lg p-6 text-center font-bold text-zinc-600">Меню загружается...</div> : null}
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
                            <p className="text-sm text-zinc-600">{product.department === "KITCHEN" ? "Кухня" : "Бар"}</p>
                          </div>
                          <span className="chip">{formatMoney(product.price)}</span>
                        </div>
                        <p className="mt-2 min-h-10 text-sm text-zinc-600">{product.description}</p>
                        <div className="mt-3 flex items-center justify-between">
                          <button className="btn btn-secondary" onClick={() => changeQuantity(product.id, -1)} aria-label="Уменьшить">
                            <Minus size={18} />
                          </button>
                          <span className="text-lg font-black">{cart[product.id] || 0}</span>
                          <button className="btn btn-primary" onClick={() => changeQuantity(product.id, 1)} aria-label="Добавить">
                            <Plus size={18} />
                          </button>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ))}
          </section>

          <aside className="grid h-fit gap-4 lg:sticky lg:top-5">
            <div className="surface rounded-lg p-4">
              <div className="mb-4 flex items-center gap-2">
                <ShoppingCart size={20} />
                <h2 className="text-xl font-black">Заказ</h2>
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

              <div className="mt-4 grid gap-3">
                <input className="control" value={customer.customerName} onChange={(event) => setCustomer({ ...customer, customerName: event.target.value })} placeholder="Имя" />
                <input className="control" value={customer.customerPhone} onChange={(event) => setCustomer({ ...customer, customerPhone: event.target.value })} placeholder="WhatsApp телефон" />
                <textarea className="control min-h-24" value={customer.deliveryAddress} onChange={(event) => setCustomer({ ...customer, deliveryAddress: event.target.value })} placeholder="Адрес доставки" />
                <div className="grid grid-cols-3 gap-2">
                  <input className="control" value={customer.deliveryEntrance} onChange={(event) => setCustomer({ ...customer, deliveryEntrance: event.target.value })} placeholder="Подъезд" />
                  <input className="control" value={customer.deliveryFloor} onChange={(event) => setCustomer({ ...customer, deliveryFloor: event.target.value })} placeholder="Этаж" />
                  <input className="control" value={customer.deliveryApartment} onChange={(event) => setCustomer({ ...customer, deliveryApartment: event.target.value })} placeholder="Кв." />
                </div>
                <textarea className="control min-h-20" value={customer.comment} onChange={(event) => setCustomer({ ...customer, comment: event.target.value })} placeholder="Комментарий к заказу" />
                <button className="btn btn-secondary w-full" onClick={detectLocation}>
                  <LocateFixed size={18} /> Добавить геолокацию
                </button>
                {locationStatus ? <p className="text-sm font-bold text-teal-800">{locationStatus}</p> : null}
              </div>

              <div className="my-4 flex items-center justify-between text-lg font-black">
                <span>Итого</span>
                <span>{formatMoney(total)}</span>
              </div>
              {submitError ? <p className="mb-3 text-sm font-bold text-red-700">{submitError}</p> : null}
              <button className="btn btn-primary w-full" onClick={submitOrder} disabled={!total || sending}>
                <Send size={18} /> {sending ? "Отправляем..." : "Оформить доставку"}
              </button>
            </div>
          </aside>
        </div>
      </div>
    </main>
  );
}
