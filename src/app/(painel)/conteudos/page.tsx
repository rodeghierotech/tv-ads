import { listMedia } from "@/actions/media";
import { extractStoragePath } from "@/lib/supabase";
import { UploadMediaDialog, DeleteMediaButton } from "./media-dialogs";

export default async function ConteudosPage() {
  const items = await listMedia();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Conteúdos</h1>
        <UploadMediaDialog />
      </div>

      {items.length === 0 ? (
        <div className="text-zinc-500 text-sm border border-dashed border-zinc-800 rounded-lg p-12 text-center">
          Nenhum conteúdo enviado ainda.
        </div>
      ) : (
        <div className="grid grid-cols-4 gap-4">
          {items.map((item) => (
            <div key={item.id} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-900">
              <div className="aspect-video bg-zinc-950 flex items-center justify-center">
                {item.type === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={item.url} alt={item.name} className="w-full h-full object-cover" />
                ) : (
                  <video src={item.url} className="w-full h-full object-cover" muted />
                )}
              </div>
              <div className="p-3">
                <div className="text-sm font-medium truncate">{item.name}</div>
                <div className="text-xs text-zinc-500 mb-2">
                  {item.type === "image" ? `Imagem · ${item.duration}s` : "Vídeo"}
                </div>
                <DeleteMediaButton id={item.id} storagePath={extractStoragePath(item.url)} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
