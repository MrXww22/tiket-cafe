import { Beer, ChefHat, ClipboardList, LayoutDashboard, Utensils } from "lucide-react";
import Link from "next/link";

const links = [
  { href: "/admin", title: "Админка", text: "Товары, категории, стоп-лист и столики", icon: LayoutDashboard },
  { href: "/waiters", title: "Официанты", text: "Занятые столики, новые заказы и готовность", icon: ClipboardList },
  { href: "/kitchen", title: "Кухня", text: "Только блюда кухни и кнопки приготовления", icon: ChefHat },
  { href: "/bar", title: "Бар", text: "Напитки и барные позиции заказа", icon: Beer },
];

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-6 sm:px-8">
      <section className="mx-auto flex min-h-[calc(100vh-48px)] max-w-6xl flex-col justify-between">
        <nav className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Utensils size={22} />
            </span>
            <div>
              <p className="text-xl font-black">TableFlow</p>
              <p className="text-sm text-zinc-600">Система электронного меню</p>
            </div>
          </div>
          <Link className="btn btn-primary" href="/admin">
            Открыть админку
          </Link>
        </nav>

        <div className="grid gap-8 py-12 lg:grid-cols-[1.1fr_0.9fr] lg:items-end">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex rounded-full bg-white/90 px-4 py-2 text-sm font-bold text-teal-800">
              QR меню + кухня + бар + Telegram
            </p>
            <h1 className="text-4xl font-black leading-tight text-zinc-950 sm:text-6xl">
              Рабочая заготовка для кафе и ресторанов
            </h1>
            <p className="mt-5 max-w-2xl text-lg leading-8 text-zinc-700">
              Гость делает заказ со столика, кухня и бар получают только свои позиции,
              официанты видят статусы и получают уведомления в Telegram-группу.
            </p>
          </div>

          <div className="surface rounded-lg p-4">
            <div className="grid gap-3">
              {links.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="flex items-center gap-3 rounded-lg border border-zinc-200 bg-white p-4 transition hover:border-teal-600"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-teal-800">
                      <Icon size={20} />
                    </span>
                    <span>
                      <span className="block font-black">{item.title}</span>
                      <span className="text-sm text-zinc-600">{item.text}</span>
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
