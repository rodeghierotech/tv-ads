"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlaylist, deletePlaylist } from "@/actions/playlist";
import { toast } from "sonner";
import { Modal } from "@/app/modal";

export function CreatePlaylistDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full bg-white px-4 py-2.5 rounded-xl text-sm font-medium text-black sm:w-auto">
        + Nova playlist
      </button>
      {open && (
        <Modal title="Nova playlist" onClose={() => { if (!pending) setOpen(false); }}>
            <form
              action={(formData) => {
                start(async () => {
                  try {
                  const created = await createPlaylist(String(formData.get("name")));
                  toast.success("Playlist criada.");
                  setOpen(false);
                  router.push(`/playlists/${created.id}`);
                  } catch { toast.error("Não foi possível criar a playlist."); }
                });
              }}
              className="space-y-3"
            >
              <input
                name="name"
                aria-label="Nome da playlist"
                maxLength={100}
                required
                placeholder="Ex: Promoções Agosto"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm"
              />
              <button type="submit" disabled={pending} className="w-full bg-white text-black py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                {pending ? "Criando..." : "Criar"}
              </button>
            </form>
        </Modal>
      )}
    </>
  );
}

export function DeletePlaylistButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir esta playlist? As TVs vinculadas ficarão sem playlist padrão e os agendamentos desta playlist serão removidos.")) {
          start(async () => {
            try { await deletePlaylist(id); router.push("/playlists"); }
            catch { toast.error("Não foi possível excluir a playlist."); }
          });
        }
      }}
      className="text-red-400 text-sm hover:underline"
    >
      Excluir playlist
    </button>
  );
}
