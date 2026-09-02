import { listTvsWithStatus } from "@/actions/tv";
import { listPlaylists } from "@/actions/playlist";
import { CreateTvDialog, PairTvDialog, AssignPlaylistSelect, DeleteTvButton } from "./tv-dialogs";

export default async function TvsPage() {
  const [tvs, playlists] = await Promise.all([listTvsWithStatus(), listPlaylists()]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">TVs</h1>
          <p className="text-sm text-zinc-400">Gerencie dispositivos, conexões e atribuições de playlist.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PairTvDialog />
          <CreateTvDialog />
        </div>
      </div>

      <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 shadow-sm shadow-black/20">
        <div className="hidden md:block overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-zinc-950/80 text-left text-xs font-medium uppercase tracking-[0.14em] text-zinc-400">
              <tr>
                <th className="px-4 py-3">Nome</th>
                <th className="px-4 py-3">Local</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Código</th>
                <th className="px-4 py-3">Playlist</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {tvs.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                    Nenhuma TV cadastrada. Abra <code>/player</code> em um dispositivo e conecte com o código gerado, ou adicione uma TV manualmente.
                  </td>
                </tr>
              )}
              {tvs.map((t) => (
                <tr key={t.id} className="border-t border-zinc-800/80 align-top">
                  <td className="px-4 py-3 font-medium text-zinc-100">{t.name}</td>
                  <td className="px-4 py-3 text-zinc-400">{t.location || "—"}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-400">{t.paired ? "—" : t.pairingCode}</td>
                  <td className="px-4 py-3">
                    <AssignPlaylistSelect tvId={t.id} currentPlaylistId={t.playlistId} playlists={playlists} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <DeleteTvButton id={t.id} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-3 p-3 md:hidden">
          {tvs.length === 0 ? (
            <div className="rounded-xl border border-dashed border-zinc-800 bg-zinc-950/50 px-4 py-8 text-center text-sm text-zinc-500">
              Nenhuma TV cadastrada. Abra <code>/player</code> em um dispositivo e conecte com o código gerado, ou adicione uma TV manualmente.
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

                <div className="mt-3 space-y-2 border-t border-zinc-800 pt-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500">Código</span>
                    <span className="font-mono text-xs text-zinc-300">{t.paired ? "—" : t.pairingCode}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-zinc-500">Playlist</span>
                    <div className="w-[58%]">
                      <AssignPlaylistSelect tvId={t.id} currentPlaylistId={t.playlistId} playlists={playlists} />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <span className="text-zinc-500">Ações</span>
                    <DeleteTvButton id={t.id} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
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
