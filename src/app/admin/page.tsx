"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import { Download, ImagePlus, Pause, Pencil, Play, Plus, RefreshCcw, Save, Star, Trash2, Wallet, X } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { AuthGate } from "@/components/AuthGate";
import { cashDenominations, cashTotal } from "@/lib/cash";
import { formatMoney } from "@/lib/money";
import type { CashCount, Category, CustomerReview, DiningTable, Product, RestaurantSettings, StaffRole, StaffUser, TableStatus, WorkShift } from "@/types/app";

type PauseFilter = "all" | "active" | "paused";
type TableFilter = "all" | TableStatus;
type AdminTab = "dishes" | "tables" | "staff" | "shift" | "reports" | "reviews" | "settings";

const tableStatusLabel: Record<TableStatus, string> = {
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

const emptyProductForm = {
  name: "",
  description: "",
  price: "500",
  imageUrl: "",
  department: "KITCHEN",
  categoryId: "",
};

const isDepartmentCategory = (category: Category) => ["кухня", "бар"].includes(category.name.trim().toLowerCase());

const defaultSettings: RestaurantSettings = {
  id: "main",
  waiterPercent: 0,
  cleanupMinutes: 5,
};

const emptyStaffForm = {
  username: "",
  name: "",
  password: "",
  role: "WAITER" as StaffRole,
};

const adminTabs: Array<{ id: AdminTab; label: string }> = [
  { id: "dishes", label: "Блюда" },
  { id: "tables", label: "Столики" },
  { id: "staff", label: "Сотрудники" },
  { id: "shift", label: "Смена и касса" },
  { id: "reports", label: "Отчеты" },
  { id: "reviews", label: "Отзывы" },
  { id: "settings", label: "Настройки" },
];

const emptyCashCount = (): CashCount => Object.fromEntries(cashDenominations.map((denomination) => [String(denomination), 0]));

const getNextTableNumber = (items: DiningTable[]) => {
  const maxNumber = items.reduce((max, table) => Math.max(max, table.number), 0);
  return String(maxNumber + 1);
};

export default function AdminPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [tables, setTables] = useState<DiningTable[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [tableNumber, setTableNumber] = useState("1");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [pauseFilter, setPauseFilter] = useState<PauseFilter>("all");
  const [tableSearch, setTableSearch] = useState("");
  const [tableFilter, setTableFilter] = useState<TableFilter>("all");
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [tableError, setTableError] = useState("");
  const [productForm, setProductForm] = useState(emptyProductForm);
  const [editProductForm, setEditProductForm] = useState(emptyProductForm);
  const [settings, setSettings] = useState(defaultSettings);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [staffForm, setStaffForm] = useState(emptyStaffForm);
  const [staffError, setStaffError] = useState("");
  const [activeAdminTab, setActiveAdminTab] = useState<AdminTab>("dishes");
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editStaffForm, setEditStaffForm] = useState(emptyStaffForm);
  const [activeShift, setActiveShift] = useState<WorkShift | null>(null);
  const [openingCash, setOpeningCash] = useState<CashCount>(() => emptyCashCount());
  const [closingCash, setClosingCash] = useState<CashCount>(() => emptyCashCount());
  const [shiftNote, setShiftNote] = useState("");
  const [shiftError, setShiftError] = useState("");
  const [reportPeriod, setReportPeriod] = useState("day");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");
  const [reviews, setReviews] = useState<CustomerReview[]>([]);

  const filteredProducts = useMemo(
    () =>
      products.filter((product) => {
        const categoryMatches = categoryFilter === "all" || product.categoryId === categoryFilter;
        const pauseMatches =
          pauseFilter === "all" ||
          (pauseFilter === "paused" && product.isPaused) ||
          (pauseFilter === "active" && !product.isPaused);

        return categoryMatches && pauseMatches;
      }),
    [categoryFilter, pauseFilter, products],
  );
  const menuCategories = useMemo(() => categories.filter((category) => !isDepartmentCategory(category)), [categories]);

  const filteredTables = useMemo(
    () =>
      tables.filter((table) => {
        const searchMatches = !tableSearch.trim() || String(table.number).includes(tableSearch.trim());
        const statusMatches = tableFilter === "all" || table.status === tableFilter;

        return searchMatches && statusMatches;
      }),
    [tableFilter, tableSearch, tables],
  );

  const pausedCount = products.filter((product) => product.isPaused).length;
  const activeCount = products.length - pausedCount;
  const waiters = staff.filter((user) => user.role === "WAITER");
  const openingTotal = cashTotal(openingCash);
  const closingTotal = cashTotal(closingCash);
  const reportQuery = new URLSearchParams(
    reportPeriod === "custom" ? { from: reportFrom, to: reportTo } : { period: reportPeriod },
  ).toString();
  const reportUrl = `/api/reports/orders?${reportQuery}`;
  const tabPanelClass = (tab: AdminTab, className: string) => (activeAdminTab === tab ? className : "hidden");

  const load = async () => {
    const [categoriesResponse, productsResponse, tablesResponse, settingsResponse, staffResponse, shiftsResponse, reviewsResponse] = await Promise.all([
      fetch("/api/categories", { cache: "no-store" }),
      fetch("/api/products", { cache: "no-store" }),
      fetch("/api/tables", { cache: "no-store" }),
      fetch("/api/settings", { cache: "no-store" }),
      fetch("/api/staff", { cache: "no-store" }),
      fetch("/api/shifts", { cache: "no-store" }),
      fetch("/api/reviews", { cache: "no-store" }),
    ]);
    const nextCategories = (await categoriesResponse.json()) as Category[];
    setCategories(nextCategories);
    setProducts((await productsResponse.json()) as Product[]);
    const nextTables = (await tablesResponse.json()) as DiningTable[];
    setTables(nextTables);
    if (settingsResponse.ok) {
      setSettings((await settingsResponse.json()) as RestaurantSettings);
    }
    if (staffResponse.ok) {
      setStaff((await staffResponse.json()) as StaffUser[]);
    }
    if (shiftsResponse.ok) {
      const data = (await shiftsResponse.json()) as { activeShift: WorkShift | null };
      setActiveShift(data.activeShift);
    }
    if (reviewsResponse.ok) {
      setReviews((await reviewsResponse.json()) as CustomerReview[]);
    }
    setTableNumber((current) => {
      const currentNumber = Number(current);
      const exists = nextTables.some((table) => table.number === currentNumber);
      return !current || exists ? getNextTableNumber(nextTables) : current;
    });
    setProductForm((current) => ({
      ...current,
      categoryId: current.categoryId || nextCategories.find((category) => !isDepartmentCategory(category))?.id || "",
    }));
  };

  useEffect(() => {
    const timer = window.setTimeout(load, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const uploadImage = async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);

    const response = await fetch("/api/uploads", {
      method: "POST",
      body: formData,
    });
    const data = (await response.json()) as { url?: string; message?: string };

    if (!response.ok || !data.url) {
      throw new Error(data.message || "Не удалось загрузить фото");
    }

    return data.url;
  };

  const uploadCreateImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    setProductForm((current) => ({ ...current, imageUrl: url }));
    event.target.value = "";
  };

  const uploadEditImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const url = await uploadImage(file);
    setEditProductForm((current) => ({ ...current, imageUrl: url }));
    event.target.value = "";
  };


  const createCategory = async (event: FormEvent) => {
    event.preventDefault();
    await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: categoryName }),
    });
    setCategoryName("");
    await load();
  };

  const createTable = async (event: FormEvent) => {
    event.preventDefault();
    setTableError("");
    const response = await fetch("/api/tables", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ number: tableNumber, seats: 4 }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setTableError(data.message || "Не удалось добавить столик");
      await load();
      return;
    }

    await load();
  };

  const createProduct = async (event: FormEvent) => {
    event.preventDefault();
    await fetch("/api/products", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(productForm),
    });
    setProductForm((current) => ({ ...emptyProductForm, categoryId: current.categoryId }));
    await load();
  };

  const createStaff = async (event: FormEvent) => {
    event.preventDefault();
    setStaffError("");
    const response = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffForm),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setStaffError(data.message || "Не удалось создать пользователя");
      return;
    }

    setStaffForm(emptyStaffForm);
    await load();
  };

  const startEditStaff = (user: StaffUser) => {
    setEditingStaffId(user.id);
    setEditStaffForm({
      username: user.username,
      name: user.name,
      password: "",
      role: user.role,
    });
  };

  const saveStaff = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingStaffId) return;

    setStaffError("");
    const response = await fetch(`/api/staff/${editingStaffId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editStaffForm),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setStaffError(data.message || "Не удалось сохранить сотрудника");
      return;
    }

    setEditingStaffId(null);
    setEditStaffForm(emptyStaffForm);
    await load();
  };

  const deleteStaff = async (user: StaffUser) => {
    if (!window.confirm(`Удалить сотрудника "${user.name}"?`)) return;

    setStaffError("");
    const response = await fetch(`/api/staff/${user.id}`, { method: "DELETE" });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setStaffError(data.message || "Не удалось удалить сотрудника");
      return;
    }

    if (editingStaffId === user.id) setEditingStaffId(null);
    await load();
  };

  const openShift = async (event: FormEvent) => {
    event.preventDefault();
    setShiftError("");
    const response = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ openingCash, note: shiftNote }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setShiftError(data.message || "Не удалось открыть смену");
      return;
    }

    setShiftNote("");
    setOpeningCash(emptyCashCount());
    await load();
  };

  const closeShift = async (event: FormEvent) => {
    event.preventDefault();
    if (!window.confirm(`Закрыть смену? Сумма в кассе: ${formatMoney(closingTotal)}`)) return;

    setShiftError("");
    const response = await fetch("/api/shifts/active", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ closingCash }),
    });

    if (!response.ok) {
      const data = (await response.json().catch(() => ({}))) as { message?: string };
      setShiftError(data.message || "Не удалось закрыть смену");
      return;
    }

    setClosingCash(emptyCashCount());
    await load();
  };

  const setCashValue = (setter: (value: CashCount) => void, current: CashCount, denomination: number, value: string) => {
    setter({ ...current, [String(denomination)]: Math.max(0, Number(value) || 0) });
  };




  const togglePause = async (product: Product) => {
    await fetch(`/api/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPaused: !product.isPaused }),
    });
    await load();
  };

  const startEditProduct = (product: Product) => {
    setEditingProductId(product.id);
    setEditProductForm({
      name: product.name,
      description: product.description,
      price: String(product.price),
      imageUrl: product.imageUrl,
      department: product.department,
      categoryId: product.categoryId,
    });
  };

  const saveProduct = async (event: FormEvent) => {
    event.preventDefault();
    if (!editingProductId) return;

    await fetch(`/api/products/${editingProductId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editProductForm),
    });
    setEditingProductId(null);
    await load();
  };

  const deleteProduct = async (product: Product) => {
    if (!window.confirm(`Удалить блюдо "${product.name}" из меню? Старые заказы сохранятся.`)) return;

    await fetch(`/api/products/${product.id}`, {
      method: "DELETE",
    });
    if (editingProductId === product.id) setEditingProductId(null);
    await load();
  };

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault();
    setSettingsSaved(false);
    const response = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });

    if (response.ok) {
      setSettings((await response.json()) as RestaurantSettings);
      setSettingsSaved(true);
      window.setTimeout(() => setSettingsSaved(false), 2500);
    }
  };

  const setTableStatus = async (table: DiningTable, status: TableStatus) => {
    await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await load();
  };

  const setTableWaiter = async (table: DiningTable, waiterId: string) => {
    await fetch(`/api/tables/${table.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ waiterId: waiterId || null }),
    });
    await load();
  };

  return (
    <AppShell title="Админка">
      <AuthGate allowed={["ADMIN"]}>
      <div className="mb-5 flex flex-wrap gap-2">
        {adminTabs.map((tab) => (
          <button key={tab.id} className={activeAdminTab === tab.id ? "btn btn-primary" : "btn btn-secondary"} onClick={() => setActiveAdminTab(tab.id)}>
            {tab.label}
          </button>
        ))}
      </div>
      <div className={["dishes", "tables", "staff"].includes(activeAdminTab) ? "grid gap-5 xl:grid-cols-[380px_1fr]" : "grid gap-5"}>
        <aside className="grid content-start gap-5">
          <form className={tabPanelClass("dishes", "surface rounded-lg p-4")} onSubmit={createCategory}>
            <h2 className="mb-3 text-lg font-black">Категория</h2>
            <div className="flex gap-2">
              <input className="control w-full" value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="Например, Завтраки" />
              <button className="btn btn-primary" type="submit" aria-label="Добавить категорию">
                <Plus size={18} />
              </button>
            </div>
          </form>

          <form className={tabPanelClass("tables", "surface rounded-lg p-4")} onSubmit={createTable}>
            <h2 className="mb-3 text-lg font-black">Столик</h2>
            <div className="flex gap-2">
              <input className="control w-full" value={tableNumber} onChange={(event) => setTableNumber(event.target.value)} type="number" min="1" />
              <button className="btn btn-primary" type="submit" aria-label="Добавить столик">
                <Plus size={18} />
              </button>
            </div>
            {tableError ? <p className="mt-2 text-sm font-bold text-red-700">{tableError}</p> : null}
          </form>

          <form className={tabPanelClass("dishes", "surface grid gap-3 rounded-lg p-4")} onSubmit={createProduct}>
            <h2 className="text-lg font-black">Блюдо меню</h2>
            <input className="control" value={productForm.name} onChange={(event) => setProductForm({ ...productForm, name: event.target.value })} placeholder="Название" required />
            <textarea className="control min-h-24" value={productForm.description} onChange={(event) => setProductForm({ ...productForm, description: event.target.value })} placeholder="Описание" />
            <input className="control" value={productForm.price} onChange={(event) => setProductForm({ ...productForm, price: event.target.value })} type="number" min="1" placeholder="Цена" required />
            <input className="control" value={productForm.imageUrl} onChange={(event) => setProductForm({ ...productForm, imageUrl: event.target.value })} placeholder="Ссылка на фото" />
            <label className="btn btn-secondary justify-start">
              <ImagePlus size={18} /> Загрузить фото
              <input className="hidden" type="file" accept="image/*" onChange={uploadCreateImage} />
            </label>
            {productForm.imageUrl ? <p className="truncate text-xs font-bold text-teal-800">{productForm.imageUrl}</p> : null}
            <select className="control" value={productForm.department} onChange={(event) => setProductForm({ ...productForm, department: event.target.value })}>
              <option value="KITCHEN">Кухня</option>
              <option value="BAR">Бар</option>
            </select>
            <select className="control" value={productForm.categoryId} onChange={(event) => setProductForm({ ...productForm, categoryId: event.target.value })} required>
              <option value="">Выбери категорию</option>
              {menuCategories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button className="btn btn-primary" type="submit">
              <Plus size={18} /> Добавить блюдо
            </button>
          </form>

          <form className={tabPanelClass("staff", "surface grid gap-3 rounded-lg p-4")} onSubmit={createStaff}>
            <h2 className="text-lg font-black">Сотрудник</h2>
            <input className="control" value={staffForm.name} onChange={(event) => setStaffForm({ ...staffForm, name: event.target.value })} placeholder="Имя сотрудника" required />
            <input className="control" value={staffForm.username} onChange={(event) => setStaffForm({ ...staffForm, username: event.target.value })} placeholder="Логин" required />
            <input className="control" value={staffForm.password} onChange={(event) => setStaffForm({ ...staffForm, password: event.target.value })} type="password" placeholder="Пароль" required />
            <select className="control" value={staffForm.role} onChange={(event) => setStaffForm({ ...staffForm, role: event.target.value as StaffRole })}>
              <option value="WAITER">Официант</option>
              <option value="KITCHEN">Кухня</option>
              <option value="BAR">Бар</option>
              <option value="ADMIN">Администратор</option>
            </select>
            <button className="btn btn-primary" type="submit">
              <Plus size={18} /> Добавить пользователя
            </button>
            {staffError ? <p className="text-sm font-bold text-red-700">{staffError}</p> : null}
            {waiters.length ? (
              <div className="grid gap-1 text-sm text-zinc-600">
                <p className="font-black text-zinc-800">Официанты:</p>
                {waiters.map((waiter) => (
                  <span key={waiter.id}>{waiter.name} · {waiter.username}</span>
                ))}
              </div>
            ) : null}
          </form>

          <div className={tabPanelClass("shift", "surface grid gap-4 rounded-lg p-4")}>
            <div>
              <h2 className="text-lg font-black">Смена и касса</h2>
              <p className="text-sm text-zinc-600">
                {activeShift ? `Открыта: ${new Date(activeShift.openedAt).toLocaleString("ru-RU")}` : "Открытой смены нет"}
              </p>
            </div>

            {!activeShift ? (
              <form className="grid gap-3" onSubmit={openShift}>
                <textarea className="control min-h-20" value={shiftNote} onChange={(event) => setShiftNote(event.target.value)} placeholder="Комментарий к смене" />
                <div className="grid grid-cols-2 gap-2">
                  {cashDenominations.map((denomination) => (
                    <label key={denomination} className="grid gap-1 text-xs font-bold text-zinc-600">
                      {denomination} сом
                      <input
                        className="control"
                        type="number"
                        min="0"
                        value={openingCash[String(denomination)] ?? 0}
                        onChange={(event) => setCashValue(setOpeningCash, openingCash, denomination, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
                <p className="font-black">Итого: {formatMoney(openingTotal)}</p>
                <button className="btn btn-primary" type="submit">
                  <Wallet size={18} /> Открыть смену
                </button>
              </form>
            ) : (
              <form className="grid gap-3" onSubmit={closeShift}>
                <div className="rounded-lg border border-zinc-200 bg-white p-3 text-sm">
                  <p>
                    Администратор: <b>{activeShift.admin?.name || "Администратор"}</b>
                  </p>
                  <p>
                    На открытии: <b>{formatMoney(activeShift.openingTotal)}</b>
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {cashDenominations.map((denomination) => (
                    <label key={denomination} className="grid gap-1 text-xs font-bold text-zinc-600">
                      {denomination} сом
                      <input
                        className="control"
                        type="number"
                        min="0"
                        value={closingCash[String(denomination)] ?? 0}
                        onChange={(event) => setCashValue(setClosingCash, closingCash, denomination, event.target.value)}
                      />
                    </label>
                  ))}
                </div>
                <p className="font-black">К закрытию: {formatMoney(closingTotal)}</p>
                <button className="btn btn-secondary" type="submit">
                  <Wallet size={18} /> Закрыть смену
                </button>
              </form>
            )}

            {shiftError ? <p className="text-sm font-bold text-red-700">{shiftError}</p> : null}
          </div>

          <div className={tabPanelClass("reports", "surface grid gap-3 rounded-lg p-4")}>
            <h2 className="text-lg font-black">Отчет</h2>
            <select className="control" value={reportPeriod} onChange={(event) => setReportPeriod(event.target.value)}>
              <option value="day">За день</option>
              <option value="month">За месяц</option>
              <option value="quarter">За квартал</option>
              <option value="custom">Период вручную</option>
            </select>
            {reportPeriod === "custom" ? (
              <div className="grid grid-cols-2 gap-2">
                <input className="control" type="date" value={reportFrom} onChange={(event) => setReportFrom(event.target.value)} />
                <input className="control" type="date" value={reportTo} onChange={(event) => setReportTo(event.target.value)} />
              </div>
            ) : null}
            <a className="btn btn-primary" href={reportUrl} download>
              <Download size={18} /> Скачать CSV
            </a>
          </div>

          <form className={tabPanelClass("settings", "surface grid gap-3 rounded-lg p-4")} onSubmit={saveSettings}>
            <h2 className="text-lg font-black">Настройки</h2>
            <label className="grid gap-1 text-sm font-bold text-zinc-700">
              Процент официанту
              <input
                className="control"
                value={settings.waiterPercent}
                onChange={(event) => setSettings({ ...settings, waiterPercent: Number(event.target.value) })}
                type="number"
                min="0"
                max="100"
                step="0.1"
              />
            </label>
            <label className="grid gap-1 text-sm font-bold text-zinc-700">
              Время уборки столика, минут
              <input
                className="control"
                value={settings.cleanupMinutes}
                onChange={(event) => setSettings({ ...settings, cleanupMinutes: Number(event.target.value) })}
                type="number"
                min="1"
                max="180"
                step="1"
              />
            </label>
            <button className="btn btn-primary" type="submit">
              <Save size={18} /> Сохранить настройки
            </button>
            {settingsSaved ? <p className="text-sm font-bold text-emerald-700">Настройки сохранены</p> : null}
          </form>
        </aside>

        <section className="grid gap-5">
          <div className={tabPanelClass("dishes", "surface rounded-lg p-4")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">Блюда</h1>
                <p className="text-sm text-zinc-600">
                  Всего: {products.length} · Активные: {activeCount} · На паузе: {pausedCount}
                </p>
              </div>
              <button className="btn btn-secondary" onClick={load}>
                <RefreshCcw size={18} /> Обновить
              </button>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-1 text-sm font-bold text-zinc-700">
                Категория
                <select className="control" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
                  <option value="all">Все категории</option>
                  {menuCategories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-bold text-zinc-700">
                Статус блюда
                <select className="control" value={pauseFilter} onChange={(event) => setPauseFilter(event.target.value as PauseFilter)}>
                  <option value="all">Все блюда</option>
                  <option value="active">Только активные</option>
                  <option value="paused">Только на паузе</option>
                </select>
              </label>

              <button
                className="btn btn-secondary self-end"
                onClick={() => {
                  setCategoryFilter("all");
                  setPauseFilter("all");
                }}
              >
                Сбросить
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="hidden grid-cols-[72px_1fr_130px_110px_350px] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-600 xl:grid">
                <span>Фото</span>
                <span>Блюдо</span>
                <span>Цена</span>
                <span>Статус</span>
                <span>Действия</span>
              </div>

              <div className="divide-y divide-zinc-200">
                {filteredProducts.map((product) =>
                  editingProductId === product.id ? (
                    <form key={product.id} className="grid gap-3 px-4 py-4" onSubmit={saveProduct}>
                      <div className="grid gap-3 lg:grid-cols-[1fr_140px_150px]">
                        <input className="control" value={editProductForm.name} onChange={(event) => setEditProductForm({ ...editProductForm, name: event.target.value })} placeholder="Название" required />
                        <input className="control" value={editProductForm.price} onChange={(event) => setEditProductForm({ ...editProductForm, price: event.target.value })} type="number" min="1" placeholder="Цена" required />
                      </div>
                      <div className="grid gap-3 lg:grid-cols-[1fr_1fr]">
                        <select className="control" value={editProductForm.department} onChange={(event) => setEditProductForm({ ...editProductForm, department: event.target.value })}>
                          <option value="KITCHEN">Кухня</option>
                          <option value="BAR">Бар</option>
                        </select>
                      </div>
                      <textarea className="control min-h-24" value={editProductForm.description} onChange={(event) => setEditProductForm({ ...editProductForm, description: event.target.value })} placeholder="Описание" />
                      <div className="grid gap-3 lg:grid-cols-[1fr_180px_1fr]">
                        <input className="control" value={editProductForm.imageUrl} onChange={(event) => setEditProductForm({ ...editProductForm, imageUrl: event.target.value })} placeholder="Ссылка на фото" />
                        <label className="btn btn-secondary justify-start">
                          <ImagePlus size={18} /> Загрузить
                          <input className="hidden" type="file" accept="image/*" onChange={uploadEditImage} />
                        </label>
                        <select className="control" value={editProductForm.categoryId} onChange={(event) => setEditProductForm({ ...editProductForm, categoryId: event.target.value })} required>
                          {menuCategories.map((category) => (
                            <option key={category.id} value={category.id}>
                              {category.name}
                            </option>
                          ))}
                        </select>
                      </div>
                      {editProductForm.imageUrl ? <p className="truncate text-xs font-bold text-teal-800">{editProductForm.imageUrl}</p> : null}
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-primary" type="submit">
                          <Save size={18} /> Сохранить
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => setEditingProductId(null)}>
                          <X size={18} /> Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <article key={product.id} className="grid gap-4 px-4 py-4 xl:grid-cols-[72px_1fr_130px_110px_350px] xl:items-center">
                      {product.imageUrl ? (
                        <img className="h-16 w-16 rounded-lg border border-zinc-200 object-cover" src={product.imageUrl} alt="" />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-zinc-50 text-xs font-bold text-zinc-400">
                          Фото
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="font-black">{product.name}</p>
                        <p className="truncate text-sm text-zinc-600">
                          {product.category?.name} · {product.department === "KITCHEN" ? "Кухня" : "Бар"} · {product.description || "Без описания"}
                        </p>
                      </div>
                      <span className="font-black">{formatMoney(product.price)}</span>
                      <span className={product.isPaused ? "chip w-fit border-red-200 bg-red-50 text-red-700" : "chip w-fit border-emerald-200 bg-emerald-50 text-emerald-700"}>
                        {product.isPaused ? "На паузе" : "Активно"}
                      </span>
                      <div className="flex flex-wrap gap-2 xl:justify-end">
                        <button className="btn btn-secondary text-sm" onClick={() => startEditProduct(product)}>
                          <Pencil size={18} /> Изменить
                        </button>
                        <button className={product.isPaused ? "btn btn-primary text-sm" : "btn btn-secondary text-sm"} onClick={() => togglePause(product)}>
                          {product.isPaused ? <Play size={18} /> : <Pause size={18} />}
                          {product.isPaused ? "Вернуть" : "Пауза"}
                        </button>
                        <button className="btn btn-secondary text-sm text-red-700" onClick={() => deleteProduct(product)}>
                          <Trash2 size={18} /> Удалить
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </div>

            {!filteredProducts.length ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
                По выбранным фильтрам блюд нет.
              </div>
            ) : null}
          </div>

          <div className={tabPanelClass("staff", "surface rounded-lg p-4")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h1 className="text-2xl font-black">Сотрудники</h1>
                <p className="text-sm text-zinc-600">Полный список пользователей, роли и доступы.</p>
              </div>
              <button className="btn btn-secondary" onClick={load}>
                <RefreshCcw size={18} /> Обновить
              </button>
            </div>

            {staffError ? <p className="mb-3 text-sm font-bold text-red-700">{staffError}</p> : null}

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="hidden grid-cols-[1fr_180px_170px_260px] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-600 lg:grid">
                <span>Сотрудник</span>
                <span>Логин</span>
                <span>Роль</span>
                <span>Действия</span>
              </div>

              <div className="divide-y divide-zinc-200">
                {staff.map((user) =>
                  editingStaffId === user.id ? (
                    <form key={user.id} className="grid gap-3 px-4 py-4" onSubmit={saveStaff}>
                      <div className="grid gap-3 lg:grid-cols-[1fr_180px_170px_180px]">
                        <input className="control" value={editStaffForm.name} onChange={(event) => setEditStaffForm({ ...editStaffForm, name: event.target.value })} placeholder="Имя" required />
                        <input className="control" value={editStaffForm.username} onChange={(event) => setEditStaffForm({ ...editStaffForm, username: event.target.value })} placeholder="Логин" required />
                        <select className="control" value={editStaffForm.role} onChange={(event) => setEditStaffForm({ ...editStaffForm, role: event.target.value as StaffRole })}>
                          <option value="WAITER">Официант</option>
                          <option value="KITCHEN">Кухня</option>
                          <option value="BAR">Бар</option>
                          <option value="ADMIN">Администратор</option>
                        </select>
                        <input className="control" value={editStaffForm.password} onChange={(event) => setEditStaffForm({ ...editStaffForm, password: event.target.value })} type="password" placeholder="Новый пароль" />
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <button className="btn btn-primary" type="submit">
                          <Save size={18} /> Сохранить
                        </button>
                        <button className="btn btn-secondary" type="button" onClick={() => setEditingStaffId(null)}>
                          <X size={18} /> Отмена
                        </button>
                      </div>
                    </form>
                  ) : (
                    <article key={user.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[1fr_180px_170px_260px] lg:items-center">
                      <div>
                        <p className="font-black">{user.name}</p>
                        <p className="text-sm text-zinc-600">{user.id}</p>
                      </div>
                      <span className="font-bold">{user.username}</span>
                      <span className="chip w-fit border-zinc-200 bg-zinc-50 text-zinc-700">{user.role}</span>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button className="btn btn-secondary text-sm" onClick={() => startEditStaff(user)}>
                          <Pencil size={18} /> Изменить
                        </button>
                        <button className="btn btn-secondary text-sm text-red-700" onClick={() => deleteStaff(user)}>
                          <Trash2 size={18} /> Удалить
                        </button>
                      </div>
                    </article>
                  ),
                )}
              </div>
            </div>
          </div>

          <div className={tabPanelClass("tables", "surface rounded-lg p-4")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Столики</h2>
                <p className="text-sm text-zinc-600">Список столиков, QR-коды и текущий статус.</p>
              </div>
              <button className="btn btn-secondary" onClick={load}>
                <RefreshCcw size={18} /> Обновить
              </button>
            </div>

            <div className="mb-4 grid gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <label className="grid gap-1 text-sm font-bold text-zinc-700">
                Поиск по номеру
                <input className="control" value={tableSearch} onChange={(event) => setTableSearch(event.target.value)} inputMode="numeric" placeholder="Например, 12" />
              </label>

              <label className="grid gap-1 text-sm font-bold text-zinc-700">
                Статус столика
                <select className="control" value={tableFilter} onChange={(event) => setTableFilter(event.target.value as TableFilter)}>
                  <option value="all">Все столики</option>
                  <option value="FREE">Только свободные</option>
                  <option value="BUSY">Только занятые</option>
                  <option value="RESERVED">Только бронь</option>
                  <option value="CLEANING">Только уборка</option>
                </select>
              </label>

              <button
                className="btn btn-secondary self-end"
                onClick={() => {
                  setTableSearch("");
                  setTableFilter("all");
                }}
              >
                Сбросить
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="hidden grid-cols-[110px_120px_180px_1fr_390px] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-600 lg:grid">
                <span>Столик</span>
                <span>Статус</span>
                <span>Официант</span>
                <span>QR и ссылка</span>
                <span>Действия</span>
              </div>

              <div className="divide-y divide-zinc-200">
                {filteredTables.map((table) => {
                  const menuPath = `/menu/${table.qrToken}`;
                  const qrPath = `/api/qr/table/${table.number}`;

                  return (
                    <article key={table.id} className="grid gap-4 px-4 py-4 lg:grid-cols-[110px_120px_180px_1fr_390px] lg:items-center">
                      <div>
                        <p className="text-lg font-black">#{table.number}</p>
                        <p className="text-sm text-zinc-600">Мест: {table.seats}</p>
                      </div>
                      <span className={`chip w-fit ${tableStatusClass[table.status]}`}>{tableStatusLabel[table.status]}</span>
                      <label className="grid gap-1 text-xs font-bold text-zinc-600">
                        <span className="lg:hidden">Официант</span>
                        <select className="control" value={table.waiterId || ""} onChange={(event) => setTableWaiter(table, event.target.value)}>
                          <option value="">Не назначен</option>
                          {waiters.map((waiter) => (
                            <option key={waiter.id} value={waiter.id}>
                              {waiter.name}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div className="flex items-center gap-3">
                        <img className="h-16 w-16 rounded-lg border border-zinc-200 bg-white p-1" src={qrPath} alt={`QR столика ${table.number}`} />
                        <div className="min-w-0">
                          <a className="block truncate text-sm font-bold text-teal-800" href={menuPath} target="_blank">
                            Открыть меню столика
                          </a>
                          <a className="mt-1 block truncate text-xs text-zinc-500" href={qrPath} download={`table-${table.number}-qr.png`}>
                            Скачать QR-код
                          </a>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 lg:justify-end">
                        <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "FREE")}>
                          Свободен
                        </button>
                        <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "BUSY")}>
                          Занят
                        </button>
                        <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "RESERVED")}>
                          Бронь
                        </button>
                        <button className="btn btn-secondary text-sm" onClick={() => setTableStatus(table, "CLEANING")}>
                          Уборка
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </div>

            {!filteredTables.length ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
                По выбранным фильтрам столиков нет.
              </div>
            ) : null}
          </div>

          <div className={tabPanelClass("reviews", "surface rounded-lg p-4")}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-black">Отзывы клиентов</h2>
                <p className="text-sm text-zinc-600">Оценки после закрытия заказа, комментарии и официанты.</p>
              </div>
              <button className="btn btn-secondary" onClick={load}>
                <RefreshCcw size={18} /> Обновить
              </button>
            </div>

            <div className="overflow-hidden rounded-lg border border-zinc-200 bg-white">
              <div className="hidden grid-cols-[120px_120px_180px_1fr_160px] gap-3 border-b border-zinc-200 bg-zinc-50 px-4 py-3 text-sm font-black text-zinc-600 lg:grid">
                <span>Оценка</span>
                <span>Столик</span>
                <span>Официант</span>
                <span>Комментарий</span>
                <span>Дата</span>
              </div>

              <div className="divide-y divide-zinc-200">
                {reviews.map((review) => (
                  <article key={review.id} className="grid gap-3 px-4 py-4 lg:grid-cols-[120px_120px_180px_1fr_160px] lg:items-center">
                    <div className="flex items-center gap-1 font-black text-amber-600">
                      <Star size={18} fill="currentColor" /> {review.rating}/5
                    </div>
                    <span className="font-bold">#{review.table?.number || "..."}</span>
                    <span className="text-sm font-bold text-zinc-700">{review.waiter?.name || review.order?.closedBy?.name || "Не указан"}</span>
                    <p className="text-sm text-zinc-700">{review.comment || "Без комментария"}</p>
                    <span className="text-sm text-zinc-500">{new Date(review.createdAt).toLocaleString("ru-RU")}</span>
                  </article>
                ))}
              </div>
            </div>

            {!reviews.length ? (
              <div className="mt-4 rounded-lg border border-dashed border-zinc-300 bg-white p-8 text-center text-zinc-600">
                Отзывов пока нет.
              </div>
            ) : null}
          </div>
        </section>
      </div>
      </AuthGate>
    </AppShell>
  );
}
