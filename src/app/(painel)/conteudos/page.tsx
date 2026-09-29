import { listMedia } from "@/actions/media";
import { UploadMediaDialog, DeleteMediaButton } from "./media-dialogs";

export default async function ConteudosPage() {
  const items = await listMedia();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-3xl">Conteúdos</h1>
          <p className="text-sm text-zinc-400">Arquivos disponíveis para montagem das playlists.</p>
        </div>
        <UploadMediaDialog />
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-zinc-800 bg-zinc-900/60 p-12 text-center text-sm text-zinc-500">
          Nenhum conteúdo enviado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/80 shadow-sm shadow-black/10">
              <div className="aspect-video bg-zinc-950">
                {item.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img loading="lazy" src={item.url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <video preload="none" src={item.url} className="h-full w-full object-cover" muted />
                )}
              </div>
              <div className="space-y-3 p-3">
                <div>
                  <div className="truncate text-sm font-medium text-zinc-100">{item.name}</div>
                  <div className="mt-1 text-xs uppercase tracking-[0.1em] text-zinc-500">
                    {item.type === "image" ? `Imagem · ${item.duration}s` : "Vídeo"}
                  </div>
                </div>
                <DeleteMediaButton id={item.id} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
