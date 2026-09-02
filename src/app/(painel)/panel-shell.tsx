"use client";

import Link from "next/link";
import { useState } from "react";
import { LayoutDashboard, Tv, ImageIcon, ListVideo, LogOut, Menu, X } from "lucide-react";

const nav = [
  { section: "Principal", items: [{ href: "/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
  {
    section: "Gerenciamento",
    items: [
      { href: "/tvs", label: "TVs", icon: Tv },
      { href: "/conteudos", label: "Conteúdos", icon: ImageIcon },
      { href: "/playlists", label: "Playlists", icon: ListVideo },
    ],
  },
];

export function PanelShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="flex min-h-screen flex-col lg:flex-row">
        <aside className="border-b border-zinc-800 bg-zinc-950/95 backdrop-blur-sm lg:sticky lg:top-0 lg:h-screen lg:w-64 lg:border-b-0 lg:border-r lg:bg-zinc-950">
          <div className="flex items-center justify-between px-4 py-3 lg:px-5 lg:py-5">
            <div className="text-lg font-semibold tracking-tight text-white">TV Ads</div>
            <button
              type="button"
              aria-label="Abrir menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-zinc-800 text-zinc-200 lg:hidden"
              onClick={() => setOpen((value) => !value)}
            >
              {open ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>

          <nav className={`${open ? "flex" : "hidden"} flex-col gap-4 px-3 pb-3 lg:flex lg:gap-2 lg:overflow-visible lg:px-3 lg:pb-6`}>
            {nav.map((group) => (
              <div key={group.section} className="min-w-0">
                <div className="px-3 pb-2 pt-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-500 lg:pt-4">
                  {group.section}
                </div>
                <div className="flex flex-col gap-1">
                  {group.items.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-2 rounded-xl border border-transparent px-3 py-2.5 text-sm font-medium text-zinc-300 transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-white"
                    >
                      <Icon size={16} />
                      <span>{label}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          <div className={`${open ? "block" : "hidden"} border-t border-zinc-800 px-3 py-3 lg:block lg:mt-auto lg:px-3 lg:pb-4`}>
            <form action="/api/auth/sign-out" method="POST">
              <button className="flex w-full items-center justify-center gap-2 rounded-xl border border-zinc-800 px-3 py-2.5 text-sm font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-white lg:justify-start">
                <LogOut size={16} />
                Sair
              </button>
            </form>
          </div>
        </aside>

        <main className="flex-1 p-4 sm:p-6 lg:p-8 xl:p-10">{children}</main>
      </div>
    </div>
  );
}
