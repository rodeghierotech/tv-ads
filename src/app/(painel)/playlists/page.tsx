import Link from "next/link";
import { listPlaylists } from "@/actions/playlist";
import { CreatePlaylistDialog } from "./playlist-dialogs";

export default async function PlaylistsPage() {
  const playlists = await listPlaylists();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Playlists</h1>
        <CreatePlaylistDialog />
      </div>

      {playlists.length === 0 ? (
        <div className="text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg p-12 text-center">
          Nenhuma playlist criada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-4">
          {playlists.map((p) => (
            <Link
              key={p.id}
              href={`/playlists/${p.id}`}
              className="border border-zinc-800 rounded-lg p-4 bg-zinc-900 hover:border-zinc-700 transition-colors"
            >
              <div className="font-medium">{p.name}</div>
              <div className="text-xs text-zinc-500 mt-1">{p.items.length} conteúdo(s)</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
