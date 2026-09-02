"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createPlaylist, deletePlaylist } from "@/actions/playlist";
import { toast } from "sonner";

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
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setOpen(false)}>
          <div onClick={(e) => e.stopPropagation()} className="mx-3 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6">
            <h2 className="text-lg font-semibold mb-4">Nova playlist</h2>
            <form
              action={(formData) => {
                start(async () => {
                  const created = await createPlaylist(String(formData.get("name")));
                  toast.success("Playlist criada.");
                  setOpen(false);
                  router.push(`/playlists/${created.id}`);
                });
              }}
              className="space-y-3"
            >
              <input
                name="name"
                required
                placeholder="Ex: Promoções Agosto"
                className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm"
              />
              <button type="submit" disabled={pending} className="w-full bg-white text-black py-3 rounded-xl text-sm font-medium disabled:opacity-50">
                {pending ? "Criando..." : "Criar"}
              </button>
            </form>
          </div>
        </div>
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
        if (confirm("Excluir esta playlist? As TVs vinculadas ficarão sem playlist.")) {
          start(async () => {
            await deletePlaylist(id);
            router.push("/playlists");
          });
        }
      }}
      className="text-red-400 text-sm hover:underline"
    >
      Excluir playlist
    </button>
  );
}
