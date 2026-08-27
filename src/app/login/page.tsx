"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "@/lib/auth-client";
import { toast } from "sonner";

export default function LoginPage() {
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center">
      <form
        className="w-full max-w-sm space-y-4 border border-zinc-800 rounded-lg p-8 bg-zinc-900"
        action={(formData) => {
          start(async () => {
            const { error } = await signIn.email({
              email: String(formData.get("email")),
              password: String(formData.get("password")),
            });
            if (error) {
              toast.error(error.message || "Credenciais inválidas");
              return;
            }
            router.push("/dashboard");
            router.refresh();
          });
        }}
      >
        <h1 className="text-xl font-semibold text-center mb-2">TV Ads Manager</h1>
        <div>
          <label className="text-sm text-zinc-400 block mb-1">Email</label>
          <input name="email" type="email" required className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="text-sm text-zinc-400 block mb-1">Senha</label>
          <input name="password" type="password" required className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm" />
        </div>
        <button type="submit" disabled={pending} className="w-full bg-white text-black py-2 rounded-md text-sm font-medium disabled:opacity-50">
          {pending ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}
