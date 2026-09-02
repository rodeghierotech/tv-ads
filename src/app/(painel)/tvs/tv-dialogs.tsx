"use client";

import { useState, useTransition } from "react";
import { createTv, deleteTv, pairTvByCode, setTvPlaylist } from "@/actions/tv";
import { toast } from "sonner";

export function CreateTvDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full bg-white px-4 py-2.5 rounded-xl text-sm font-medium text-black sm:w-auto">
        + Adicionar TV
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Adicionar TV">
          <form
            action={(formData) => {
              start(async () => {
                try {
                  await createTv({
                    name: String(formData.get("name")),
                    location: String(formData.get("location") || ""),
                  });
                  toast.success("TV criada. Compartilhe o código com o dispositivo.");
                  setOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao criar TV");
                }
              });
            }}
            className="space-y-3"
          >
            <Field label="Nome" name="name" required />
            <Field label="Local" name="location" />
            <SubmitButton pending={pending} label="Criar" />
          </form>
        </Modal>
      )}
    </>
  );
}

export function PairTvDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full border border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-medium sm:w-auto">
        Conectar dispositivo
      </button>
      {open && (
        <Modal onClose={() => setOpen(false)} title="Conectar dispositivo pareado">
          <form
            action={(formData) => {
              start(async () => {
                try {
                  await pairTvByCode(
                    String(formData.get("code")),
                    String(formData.get("name")),
                    String(formData.get("location") || ""),
                  );
                  toast.success("Dispositivo conectado.");
                  setOpen(false);
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao parear");
                }
              });
            }}
            className="space-y-3"
          >
            <Field label="Código exibido no dispositivo" name="code" required placeholder="A7K9-21QF" />
            <Field label="Nome da TV" name="name" required />
            <Field label="Local" name="location" />
            <SubmitButton pending={pending} label="Conectar" />
          </form>
        </Modal>
      )}
    </>
  );
}

export function AssignPlaylistSelect({
  tvId,
  currentPlaylistId,
  playlists,
}: {
  tvId: string;
  currentPlaylistId: string | null;
  playlists: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  return (
    <select
      defaultValue={currentPlaylistId ?? ""}
      disabled={pending}
      onChange={(e) => start(() => setTvPlaylist(tvId, e.target.value || null))}
      className="w-full min-w-0 bg-zinc-900 border border-zinc-700 rounded-md text-sm px-2 py-2.5 sm:w-auto"
    >
      <option value="">Sem playlist</option>
      {playlists.map((p) => (
        <option key={p.id} value={p.id}>
          {p.name}
        </option>
      ))}
    </select>
  );
}

export function DeleteTvButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return (
    <button
      disabled={pending}
      onClick={() => {
        if (confirm("Excluir esta TV?")) start(() => deleteTv(id));
      }}
      className="text-red-400 text-sm hover:underline"
    >
      Excluir
    </button>
  );
}

function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="mx-3 w-full max-w-sm rounded-2xl border border-zinc-800 bg-zinc-900 p-4 sm:p-6"
      >
        <h2 className="text-lg font-semibold mb-4">{title}</h2>
        {children}
      </div>
    </div>
  );
}

function Field({ label, name, required, placeholder }: { label: string; name: string; required?: boolean; placeholder?: string }) {
  return (
    <div>
      <label className="text-sm text-zinc-400 block mb-1">{label}</label>
      <input
        name={name}
        required={required}
        placeholder={placeholder}
        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm"
      />
    </div>
  );
}

function SubmitButton({ pending, label }: { pending: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full bg-white text-black py-3 rounded-xl text-sm font-medium disabled:opacity-50"
    >
      {pending ? "Salvando..." : label}
    </button>
  );
}
