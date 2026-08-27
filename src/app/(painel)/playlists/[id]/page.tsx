import { notFound } from "next/navigation";
import { getPlaylistWithItems } from "@/actions/playlist";
import { listMedia } from "@/actions/media";
import { PlaylistEditor } from "../playlist-editor";
import { DeletePlaylistButton } from "../playlist-dialogs";

export default async function PlaylistDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [playlist, allMedia] = await Promise.all([getPlaylistWithItems(id), listMedia()]);

  if (!playlist) notFound();

  const usedIds = new Set(playlist.items.map((i) => i.mediaId));
  const availableMedia = allMedia.filter((m) => !usedIds.has(m.id));

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{playlist.name}</h1>
          <p className="text-xs text-zinc-500">Versão {playlist.version}</p>
        </div>
        <DeletePlaylistButton id={playlist.id} />
      </div>

      <PlaylistEditor
        playlistId={playlist.id}
        initialItems={playlist.items.map((i) => ({ id: i.id, media: i.media }))}
        availableMedia={availableMedia}
      />
    </div>
  );
}
