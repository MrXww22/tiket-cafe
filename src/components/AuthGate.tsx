"use client";

import type { StaffRole } from "@/generated/prisma/enums";
import { LogOut } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";

type User = {
  id: string;
  username: string;
  name: string;
  role: StaffRole;
};

const roleHome: Record<StaffRole, string> = {
  ADMIN: "/admin",
  WAITER: "/waiters",
  KITCHEN: "/kitchen",
  BAR: "/bar",
};

export function AuthGate({ allowed, children }: { allowed: StaffRole[]; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/me", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) {
          window.location.href = `/login?next=${encodeURIComponent(window.location.pathname)}`;
          return;
        }

        const data = (await response.json()) as { user: User };
        if (!allowed.includes(data.user.role)) {
          window.location.href = roleHome[data.user.role];
          return;
        }

        setUser(data.user);
      })
      .finally(() => setLoading(false));
  }, [allowed]);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.href = "/login";
  };

  if (loading) {
    return <div className="surface rounded-lg p-6 text-zinc-600">Проверка доступа...</div>;
  }

  if (!user) return null;

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-white/90 p-3 shadow-sm">
        <div>
          <p className="text-sm font-bold text-zinc-500">Сотрудник</p>
          <p className="font-black">
            {user.name} · {user.role}
          </p>
        </div>
        <button className="btn btn-secondary" onClick={logout}>
          <LogOut size={18} /> Выйти
        </button>
      </div>
      {children}
    </div>
  );
}
