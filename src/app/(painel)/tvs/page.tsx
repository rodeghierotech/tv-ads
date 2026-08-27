import { listTvsWithStatus } from "@/actions/tv";
import { listPlaylists } from "@/actions/playlist";
import { CreateTvDialog, PairTvDialog, AssignPlaylistSelect, DeleteTvButton } from "./tv-dialogs";

export default async function TvsPage() {
  const [tvs, playlists] = await Promise.all([listTvsWithStatus(), listPlaylists()]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">TVs</h1>
        <div className="flex gap-2">
          <PairTvDialog />
          <CreateTvDialog />
        </div>
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="p-3">Nome</th>
              <th className="p-3">Local</th>
              <th className="p-3">Status</th>
              <th className="p-3">Código</th>
              <th className="p-3">Playlist</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {tvs.length === 0 && (
              <tr>
                <td colSpan={6} className="p-6 text-center text-zinc-500">
                  Nenhuma TV cadastrada. Abra <code>/player</code> em um dispositivo e conecte com o código gerado, ou adicione uma TV manualmente.
                </td>
              </tr>
            )}
            {tvs.map((t) => (
              <tr key={t.id} className="border-t border-zinc-800">
                <td className="p-3">{t.name}</td>
                <td className="p-3 text-zinc-400">{t.location || "—"}</td>
                <td className="p-3">
                  {t.status === "online" ? (
                    <span className="text-green-400">🟢 Online</span>
                  ) : (
                    <span className="text-red-400">🔴 Offline</span>
                  )}
                </td>
                <td className="p-3 font-mono text-zinc-500">{t.paired ? "—" : t.pairingCode}</td>
                <td className="p-3">
                  <AssignPlaylistSelect tvId={t.id} currentPlaylistId={t.playlistId} playlists={playlists} />
                </td>
                <td className="p-3">
                  <DeleteTvButton id={t.id} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
