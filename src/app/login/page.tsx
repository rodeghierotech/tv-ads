"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

const demoCredentials = {
  email: "admin2@empresa.com",
  password: "senha123",
};

export default function LoginPage() {
  const [pending, start] = useTransition();
  const router = useRouter();

  function login(email: string, password: string) {
    start(async () => {
      const { error } = await signIn.email({ email, password });
      if (error) {
        toast.error(error.message || "Não foi possível entrar");
        return;
      }
      router.push("/dashboard");
      router.refresh();
    });
  }

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-50 flex items-center justify-center">
      <form
        className="w-full max-w-md space-y-5 border border-zinc-800 rounded-lg p-6 sm:p-8 bg-zinc-900 shadow-2xl shadow-black/30"
        action={(formData) => {
          login(String(formData.get("email")), String(formData.get("password")));
        }}
      >
        <div className="space-y-2 text-center">
          <p className="text-sm font-medium text-zinc-400">Painel demonstrativo</p>
          <h1 className="text-2xl font-semibold">TV Ads Manager</h1>
          <p className="text-sm leading-6 text-zinc-400">
            Entre com o acesso abaixo para testar o cadastro de TVs, conteúdos e playlists.
          </p>
        </div>

        <div className="rounded-lg border border-zinc-800 bg-zinc-950/70 p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Acesso para teste</p>
              <p className="text-xs text-zinc-500">Use estes dados para conhecer o painel.</p>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() => login(demoCredentials.email, demoCredentials.password)}
              className="shrink-0 rounded-md bg-emerald-400 px-3 py-2 text-xs font-semibold text-zinc-950 transition hover:bg-emerald-300 disabled:opacity-50"
            >
              Entrar agora
            </button>
          </div>
          <div className="grid gap-2 text-sm">
            <div className="flex items-center justify-between gap-3 rounded-md bg-zinc-900 px-3 py-2">
              <span className="text-zinc-500">Email</span>
              <strong className="break-all text-right font-medium text-zinc-100">{demoCredentials.email}</strong>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md bg-zinc-900 px-3 py-2">
              <span className="text-zinc-500">Senha</span>
              <strong className="font-medium text-zinc-100">{demoCredentials.password}</strong>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Email</label>
            <input
              name="email"
              type="email"
              defaultValue={demoCredentials.email}
              required
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />
          </div>
          <div>
            <label className="text-sm text-zinc-400 block mb-1">Senha</label>
            <input
              name="password"
              type="password"
              defaultValue={demoCredentials.password}
              required
              className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm outline-none transition focus:border-emerald-400"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-white text-black py-2.5 rounded-md text-sm font-semibold transition hover:bg-zinc-200 disabled:opacity-50"
        >
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
