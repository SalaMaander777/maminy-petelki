"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { ApiError, login } from "@/lib/admin-api";
import { Button, ErrorBox, Field, inputCls } from "./ui";

function safeNext(next: string | null | undefined): string {
  return next && next.startsWith("/admin") && !next.startsWith("/admin/login") && !next.startsWith("//") ? next : "/admin";
}

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ username?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const fe: typeof errors = {};
    if (!username.trim()) fe.username = "Введите логин";
    if (!password) fe.password = "Введите пароль";
    setErrors(fe);
    setError("");
    if (fe.username || fe.password) return;
    setBusy(true);
    try {
      await login(username.trim(), password);
      router.replace(safeNext(next));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.status === 401 ? "Неверный логин или пароль. Проверьте и попробуйте снова." : err.message);
      } else setError("Что-то пошло не так. Попробуйте ещё раз.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-5 rounded-2xl border border-line bg-white p-6 shadow-sm">
      <h1 className="text-2xl font-extrabold text-burgundy">Вход в админ-панель</h1>
      {error && <ErrorBox>{error}</ErrorBox>}
      <Field label="Логин" error={errors.username}>
        {(p) => (
          <input {...p} className={inputCls} value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoCapitalize="none" autoCorrect="off" />
        )}
      </Field>
      <Field label="Пароль" error={errors.password}>
        {(p) => (
          <input {...p} type="password" className={inputCls} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
        )}
      </Field>
      <Button type="submit" busy={busy} className="w-full">
        {busy ? "Входим…" : "Войти"}
      </Button>
    </form>
  );
}
