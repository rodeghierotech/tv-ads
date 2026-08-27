"use client";

import { useState, useTransition, useRef } from "react";
import { uploadMedia, deleteMedia } from "@/actions/media";
import { toast } from "sonner";

export function UploadMediaDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <button onClick={() => setOpen(true)} className="bg-white text-black px-4 py-2 rounded-md text-sm font-medium">
        + Enviar conteúdo
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Enviar conteúdo</h2>
            <form
              ref={formRef}
              action={(formData) => {
                start(async () => {
                  try {
                    await uploadMedia(formData);
                    toast.success("Conteúdo enviado.");
                    formRef.current?.reset();
                    setOpen(false);
                  } catch (e) {
                    toast.error(e instanceof Error ? e.message : "Erro ao enviar");
                  }
                });
              }}
              className="space-y-3"
            >
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Arquivo (imagem ou vídeo)</label>
                <input type="file" name="file" required accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="w-full text-sm" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Nome</label>
                <input name="name" className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label className="text-sm text-zinc-400 block mb-1">Duração (segundos, apenas para imagem)</label>
                <input name="duration" type="number" defaultValue={10} min={1} className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={pending} className="w-full bg-white text-black py-2 rounded-md text-sm font-medium disabled:opacity-50">
                {pending ? "Enviando..." : "Enviar"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function DeleteMediaButton({ id, storagePath }: { id: string; storagePath: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir este conteúdo?")) start(() => deleteMedia(id, storagePath));
      }}
      className="text-red-400 text-xs hover:underline"
    >
      Excluir
    </button>
  );
}
