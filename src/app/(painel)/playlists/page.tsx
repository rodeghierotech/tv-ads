import Link from "next/link";
import { listPlaylists } from "@/actions/playlist";
import { CreatePlaylistDialog } from "./playlist-dialogs";

export default async function PlaylistsPage() {
  const playlists = await listPlaylists();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Playlists</h1>
          <p className="text-sm text-zinc-400">Organize sequências de conteúdo para reprodução.</p>
        </div>
        <CreatePlaylistDialog />
      </div>

      {playlists.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-12 text-center text-sm text-zinc-500">
          Nenhuma playlist criada ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {playlists.map((p) => (
            <Link
              key={p.id}
              href={`/playlists/${p.id}`}
              className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              <div className="text-base font-medium text-zinc-100">{p.name}</div>
              <div className="mt-2 text-xs uppercase tracking-[0.12em] text-zinc-500">{p.items.length} conteúdo(s)</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
