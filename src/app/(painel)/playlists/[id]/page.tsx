import { notFound } from "next/navigation";
import { getPlaylistWithItems } from "@/actions/playlist";
import { listMediaOptions } from "@/actions/media";
import { PlaylistEditor } from "../playlist-editor";
import { DeletePlaylistButton } from "../playlist-dialogs";

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [playlist, allMedia] = await Promise.all([getPlaylistWithItems(id), listMediaOptions()]);

  if (!playlist) notFound();

  const usedIds = new Set(playlist.items.map((i) => i.mediaId));
  const availableMedia = allMedia.filter((m) => !usedIds.has(m.id));

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">{playlist.name}</h1>
          <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">Versão {playlist.version}</p>
        </div>
        <DeletePlaylistButton id={playlist.id} />
      </div>

      <PlaylistEditor
        key={`${playlist.id}:${playlist.version}`}
        playlistId={playlist.id}
        initialItems={playlist.items.map((i) => ({ id: i.id, media: i.media }))}
        availableMedia={availableMedia}
      />
    </div>
  );
}
