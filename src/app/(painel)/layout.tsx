import Link from "next/link";
import { LayoutDashboard, Tv, ImageIcon, ListVideo, Settings, LogOut } from "lucide-react";

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
  { section: "Sistema", items: [{ href: "/configuracoes", label: "Configurações", icon: Settings }] },
];

export default function PainelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900 p-4 flex flex-col justify-between">
        <div>
          <div className="text-lg font-bold px-2 mb-6">TV Ads</div>
          <nav className="space-y-6">
            {nav.map((group) => (
              <div key={group.section}>
                <div className="text-xs uppercase text-zinc-500 px-2 mb-2">{group.section}</div>
                <div className="space-y-1">
                  {group.items.map(({ href, label, icon: Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
                    >
                      <Icon size={16} />
                      {label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>
        <form action="/api/auth/sign-out" method="POST">
          <button className="flex items-center gap-2 px-2 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-white w-full">
            <LogOut size={16} />
            Sair
          </button>
        </form>
      </aside>
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
