import { db } from "@/db";
import { media, playlist } from "@/db/schema";
import { listTvsWithStatus } from "@/actions/tv";
import { count, eq } from "drizzle-orm";
import { Activity, Film, ImageIcon, ListVideo, MonitorPlay, Tv, Wifi, WifiOff } from "lucide-react";

export default async function DashboardPage() {
  const [tvs, [{ imgCount }], [{ vidCount }], [{ playlistCount }]] = await Promise.all([
    listTvsWithStatus(),
    db.select({ imgCount: count() }).from(media).where(eq(media.type, "image")),
    db.select({ vidCount: count() }).from(media).where(eq(media.type, "video")),
    db.select({ playlistCount: count() }).from(playlist),
  ]);

  const online = tvs.filter((t) => t.status === "online").length;
  const offline = tvs.length - online;
  const totalMedia = imgCount + vidCount;
  const onlinePercent = tvs.length ? Math.round((online / tvs.length) * 100) : 0;
  const featuredTvs = tvs.slice(0, 4);

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-2xl shadow-black/20">
        <div className="grid gap-0 lg:grid-cols-[1.4fr_0.9fr]">
          <div className="relative overflow-hidden bg-[linear-gradient(135deg,#042f2e_0%,#0f172a_45%,#111827_100%)] p-6 sm:p-8">
            <div className="absolute inset-x-0 bottom-0 h-1 bg-[linear-gradient(90deg,#34d399,#22d3ee,#f59e0b,#fb7185)]" />
            <div className="relative space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
                <Activity size={14} />
                Painel em tempo real
              </div>
              <div className="max-w-2xl space-y-3">
                <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Dashboard TV Ads</h1>
                <p className="text-sm leading-6 text-zinc-300 sm:text-base">
                  Controle suas telas, campanhas e playlists em um painel simples para operação diária e demonstrações comerciais.
                </p>
              </div>
              <div className="grid max-w-xl gap-3 sm:grid-cols-3">
                <HeroMetric label="TVs ativas" value={online} icon={Wifi} tone="emerald" />
                <HeroMetric label="Conteúdos" value={totalMedia} icon={ImageIcon} tone="cyan" />
                <HeroMetric label="Playlists" value={playlistCount} icon={ListVideo} tone="amber" />
              </div>
            </div>
          </div>

          <div className="border-t border-zinc-800 bg-zinc-950 p-6 sm:p-8 lg:border-l lg:border-t-0">
            <div className="flex h-full flex-col justify-between gap-6">
              <div>
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-zinc-400">Saúde da rede</p>
                    <p className="mt-1 text-4xl font-semibold text-white">{onlinePercent}%</p>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
                    <MonitorPlay size={26} />
                  </div>
                </div>
                <div className="mt-5 h-3 overflow-hidden rounded-full bg-zinc-800">
                  <div
                    className="h-full rounded-full bg-[linear-gradient(90deg,#34d399,#22d3ee)]"
                    style={{ width: `${onlinePercent}%` }}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <StatusSummary label="Online" value={online} tone="emerald" />
                <StatusSummary label="Offline" value={offline} tone="rose" />
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard
          title="TVs"
          icon={Tv}
          tone="emerald"
          rows={[["Total", tvs.length], ["Online", online], ["Offline", offline]]}
        />
        <StatCard
          title="Conteúdos"
          icon={Film}
          tone="cyan"
          rows={[["Imagens", imgCount], ["Vídeos", vidCount]]}
        />
        <StatCard title="Playlists" icon={ListVideo} tone="amber" rows={[["Total", playlistCount]]} />
      </div>

      <section className="grid gap-4 xl:grid-cols-[1fr_340px]">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-xl shadow-black/10">
          <div className="flex items-center justify-between gap-4 border-b border-zinc-800 px-4 py-4 sm:px-5">
            <div>
              <h2 className="text-base font-semibold text-white">Monitoramento das TVs</h2>
              <p className="mt-1 text-sm text-zinc-400">Acompanhe quais telas estão sincronizadas.</p>
            </div>
            <div className="hidden rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs font-semibold text-cyan-200 sm:block">
              {tvs.length} dispositivos
            </div>
          </div>

        <div className="hidden md:block overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/80 text-left text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
              <tr>
                <th className="px-4 py-3">TV</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Playlist</th>
              </tr>
            </thead>
            <tbody>
              {tvs.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma TV cadastrada ainda.
                  </td>
                </tr>
              )}
              {tvs.map((t) => (
                <tr key={t.id} className="border-t border-zinc-800/80 transition-colors hover:bg-zinc-800/40">
                  <td className="px-4 py-3 font-medium text-zinc-100">{t.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{t.location || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 text-zinc-400">{t.playlist?.name ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {tvs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
              Nenhuma TV cadastrada ainda.
            </div>
          ) : (
            tvs.map((t) => (
              <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-medium text-zinc-100">{t.name}</div>
                    <div className="mt-1 text-xs text-zinc-400">{t.location || "Sem local"}</div>
                  </div>
                  <StatusBadge status={t.status} />
                </div>
                <div className="mt-3 border-t border-zinc-800 pt-3 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-zinc-500">Playlist</span>
                    <span className="text-right text-zinc-300">{t.playlist?.name ?? "—"}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        </div>

        <aside className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 shadow-xl shadow-black/10">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-white">Destaques</h2>
              <p className="mt-1 text-sm text-zinc-400">Resumo rápido para venda e operação.</p>
            </div>
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-400/10 text-amber-300">
              <Activity size={20} />
            </div>
          </div>

          <div className="space-y-3">
            {featuredTvs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-zinc-700 bg-zinc-950/50 px-4 py-6 text-center text-sm text-zinc-500">
                Cadastre uma TV para preencher este painel.
              </div>
            ) : (
              featuredTvs.map((t) => (
                <div key={t.id} className="rounded-xl border border-zinc-800 bg-zinc-950/60 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-zinc-100">{t.name}</p>
                      <p className="mt-1 truncate text-xs text-zinc-500">{t.playlist?.name ?? "Sem playlist"}</p>
                    </div>
                    {t.status === "online" ? (
                      <Wifi className="shrink-0 text-emerald-300" size={18} />
                    ) : (
                      <WifiOff className="shrink-0 text-rose-300" size={18} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}

function HeroMetric({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Activity;
  tone: "emerald" | "cyan" | "amber";
}) {
  const tones = {
    emerald: "border-emerald-300/20 bg-emerald-300/10 text-emerald-200",
    cyan: "border-cyan-300/20 bg-cyan-300/10 text-cyan-200",
    amber: "border-amber-300/20 bg-amber-300/10 text-amber-200",
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <Icon size={18} />
      <div className="mt-3 text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}

function StatusSummary({ label, value, tone }: { label: string; value: number; tone: "emerald" | "rose" }) {
  const tones = {
    emerald: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
    rose: "border-rose-400/20 bg-rose-400/10 text-rose-200",
  };

  return (
    <div className={`rounded-xl border p-3 ${tones[tone]}`}>
      <div className="text-2xl font-semibold text-white">{value}</div>
      <div className="mt-1 text-xs font-medium">{label}</div>
    </div>
  );
}

function StatCard({
  title,
  rows,
  icon: Icon,
  tone,
}: {
  title: string;
  rows: [string, number][];
  icon: typeof Activity;
  tone: "emerald" | "cyan" | "amber";
}) {
  const tones = {
    emerald: "from-emerald-400/20 text-emerald-300",
    cyan: "from-cyan-400/20 text-cyan-300",
    amber: "from-amber-400/20 text-amber-300",
  };

  return (
    <div className={`rounded-2xl border border-zinc-800 bg-gradient-to-br ${tones[tone]} to-zinc-900 p-4 shadow-xl shadow-black/10`}>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="text-sm font-medium text-zinc-300">{title}</div>
        <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
          <Icon size={18} />
        </div>
      </div>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-center justify-between gap-3 rounded-lg border border-zinc-800/80 bg-zinc-950/55 px-3 py-2 text-sm">
            <span className="text-zinc-400">{label}</span>
            <span className="font-semibold text-zinc-100">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: "online" | "offline" }) {
  const online = status === "online";

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium ${
        online
          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
          : "border-red-500/30 bg-red-500/10 text-red-300"
      }`}
    >
      <span
        className={`h-2.5 w-2.5 rounded-full ${
          online ? "bg-emerald-400 shadow-[0_0_0_4px_rgba(52,211,153,0.12)]" : "bg-red-400 shadow-[0_0_0_4px_rgba(248,113,113,0.12)]"
        }`}
      />
      {online ? "Online" : "Offline"}
    </span>
  );
}
