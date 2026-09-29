"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

// Optional public demo access. Never configure a real administrator here.
const demoEmail = process.env.NEXT_PUBLIC_DEMO_EMAIL ?? "";
const demoPassword = process.env.NEXT_PUBLIC_DEMO_PASSWORD ?? "";

function getSafeReturnPath() {
  const returnTo = new URLSearchParams(window.location.search).get("returnTo");
  return returnTo?.startsWith("/") && !returnTo.startsWith("//") && !returnTo.includes("\\")
    ? returnTo
    : "/dashboard";
}

export default function LoginPage() {
  const [pending, start] = useTransition();
  const router = useRouter();
  function login(email: string, password: string) {
    start(async () => {
      try {
        const { error } = await signIn.email({ email, password });
        if (error) { toast.error("Não foi possível entrar. Confira seu email e senha."); return; }
        router.push(getSafeReturnPath()); router.refresh();
      } catch { toast.error("Falha de conexão. Tente novamente."); }
    });
  }
  return <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-8 text-zinc-50">
    <form className="w-full max-w-md space-y-5 rounded-lg border border-zinc-800 bg-zinc-900 p-6 shadow-2xl sm:p-8" action={(data) => login(String(data.get("email")), String(data.get("password")))}>
      <div className="space-y-2 text-center"><h1 className="text-2xl font-semibold">TV Ads Manager</h1><p className="text-sm text-zinc-400">Entre para gerenciar TVs, conteúdos e playlists.</p></div>
      {demoEmail && demoPassword && <div className="space-y-3 rounded-lg border border-zinc-800 bg-zinc-950 p-4"><p className="text-sm">Acesso demonstrativo</p><button type="button" disabled={pending} onClick={() => login(demoEmail, demoPassword)} className="rounded-md bg-emerald-400 px-3 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-50">Entrar na demonstração</button></div>}
      <div><label htmlFor="email" className="mb-1 block text-sm text-zinc-400">Email</label><input id="email" name="email" type="email" autoComplete="username" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" /></div>
      <div><label htmlFor="password" className="mb-1 block text-sm text-zinc-400">Senha</label><input id="password" name="password" type="password" autoComplete="current-password" required className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm" /></div>
      <button type="submit" disabled={pending} className="w-full rounded-md bg-white py-2.5 text-sm font-semibold text-black disabled:opacity-50">{pending ? "Entrando..." : "Entrar"}</button>
    </form>
  </div>;
}
