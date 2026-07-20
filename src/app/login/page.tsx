"use client";

import { LogIn } from "lucide-react";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

const roleHome = {
  ADMIN: "/admin",
  WAITER: "/waiters",
  KITCHEN: "/kitchen",
  BAR: "/bar",
};

function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const demoUsers = useMemo(
    () => [
      ["admin", "admin123", "Администратор"],
      ["waiter", "waiter123", "Официант"],
      ["kitchen", "kitchen123", "Кухня"],
      ["bar", "bar123", "Бар"],
    ],
    [],
  );

  const login = async (event: FormEvent) => {
    event.preventDefault();
    setError("");

    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = (await response.json().catch(() => ({}))) as {
      message?: string;
      user?: { role: keyof typeof roleHome };
    };

    if (!response.ok || !data.user) {
      setError(data.message || "Не удалось войти");
      return;
    }

    window.location.href = next || roleHome[data.user.role] || "/";
  };

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-5">
      <section className="surface w-full max-w-md rounded-lg p-5">
        <h1 className="text-3xl font-black">Вход для сотрудников</h1>
        <p className="mt-1 text-sm text-zinc-600">Администраторы, официанты, кухня и бар входят в свои рабочие места.</p>

        <form className="mt-5 grid gap-3" onSubmit={login}>
          <input className="control" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Логин" autoComplete="username" />
          <input className="control" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Пароль" type="password" autoComplete="current-password" />
          {error ? <p className="text-sm font-bold text-red-700">{error}</p> : null}
          <button className="btn btn-primary" type="submit">
            <LogIn size={18} /> Войти
          </button>
        </form>

        <div className="mt-5 rounded-lg bg-zinc-50 p-3 text-sm text-zinc-600">
          <p className="mb-2 font-black text-zinc-800">Тестовые доступы</p>
          {demoUsers.map(([loginName, loginPassword, role]) => (
            <p key={loginName}>
              {role}: <b>{loginName}</b> / <b>{loginPassword}</b>
            </p>
          ))}
        </div>
      </section>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<main className="flex min-h-screen items-center justify-center px-4 py-5">Загрузка...</main>}>
      <LoginForm />
    </Suspense>
  );
}
