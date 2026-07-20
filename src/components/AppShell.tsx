import { Utensils } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

const nav = [
  ["Админка", "/admin"],
  ["Официанты", "/waiters"],
  ["Кухня", "/kitchen"],
  ["Бар", "/bar"],
  ["Вход", "/login"],
];

export function AppShell({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="min-h-screen px-4 py-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-5 flex flex-col gap-4 rounded-lg bg-white/90 p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-teal-700 text-white">
              <Utensils size={20} />
            </span>
            <span>
              <span className="block text-lg font-black">TableFlow</span>
              <span className="text-sm text-zinc-600">{title}</span>
            </span>
          </Link>
          <nav className="flex flex-wrap gap-2">
            {nav.map(([label, href]) => (
              <Link key={href} className="btn btn-secondary text-sm" href={href}>
                {label}
              </Link>
            ))}
          </nav>
        </header>
        {children}
      </div>
    </main>
  );
}
