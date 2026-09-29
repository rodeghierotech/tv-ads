"use client";

import { useState, useTransition, useRef } from "react";
import { uploadMedia, deleteMedia } from "@/actions/media";
import { toast } from "sonner";
import { Modal } from "@/app/modal";
import { MAX_MEDIA_BYTES } from "@/lib/media-validation";

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
        <Modal title="Enviar conteúdo" onClose={() => { if (!pending) setOpen(false); }}>
            <form
              ref={formRef}
              action={(formData) => {
                start(async () => {
                  try {
                    const file = formData.get("file");
                    if (!(file instanceof File) || file.size > MAX_MEDIA_BYTES) { toast.error("Selecione um arquivo de até 3 MB."); return; }
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
                <label htmlFor="media-file" className="text-sm text-zinc-400 block mb-1">Arquivo (imagem ou vídeo, até 3 MB)</label>
                <input id="media-file" type="file" name="file" required accept="image/jpeg,image/png,image/webp,video/mp4,video/webm" className="w-full text-sm" />
              </div>
              <div>
                <label htmlFor="media-name" className="text-sm text-zinc-400 block mb-1">Nome</label>
                <input id="media-name" name="name" maxLength={100} className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm" />
              </div>
              <div>
                <label htmlFor="media-duration" className="text-sm text-zinc-400 block mb-1">Duração (segundos, apenas para imagem)</label>
                <input id="media-duration" name="duration" max={86400} type="number" defaultValue={10} min={1} className="w-full bg-zinc-950 border border-zinc-700 rounded-md px-3 py-2 text-sm" />
              </div>
              <button type="submit" disabled={pending} className="w-full bg-white text-black py-2 rounded-md text-sm font-medium disabled:opacity-50">
                {pending ? "Enviando..." : "Enviar"}
              </button>
            </form>
        </Modal>
      )}
    </>
  );
}

export function DeleteMediaButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir este conteúdo?")) start(async () => { try { await deleteMedia(id); toast.success("Conteúdo excluído."); } catch { toast.error("Não foi possível excluir o conteúdo."); } });
      }}
      className="text-red-400 text-xs hover:underline"
    >
      Excluir
    </button>
  );
}
