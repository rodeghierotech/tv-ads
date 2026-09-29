"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createTv, deleteTv, pairTvByCode, setTvPlaylist, revokeTvAccess } from "@/actions/tv";
import { toast } from "sonner";
import { Modal } from "@/app/modal";

export function CreateTvDialog() {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();

  return (
    <>
      <button onClick={() => setOpen(true)} className="w-full bg-white px-4 py-2.5 rounded-xl text-sm font-medium text-black sm:w-auto">
        + Adicionar TV
      </button>
      {open && (
        <Modal onClose={() => { if (!pending) setOpen(false); }} title="Adicionar TV">
          <form
            action={(formData) => {
              start(async () => {
                try {
                  await createTv({
                    name: String(formData.get("name")),
                    location: String(formData.get("location") || ""),
                  });
                  toast.success("TV criada.");
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

export function PairTvDialog({ initialCode }: { initialCode?: string }) {
  const [open, setOpen] = useState(Boolean(initialCode));
  const [codeFromQr, setCodeFromQr] = useState(initialCode ?? null);
  const [pending, start] = useTransition();
  const router = useRouter();

  return (
    <>
      <button onClick={() => { setCodeFromQr(null); setOpen(true); }} className="w-full border border-zinc-700 px-4 py-2.5 rounded-xl text-sm font-medium sm:w-auto">
        Conectar dispositivo
      </button>
      {open && (
        <Modal onClose={() => { if (!pending) setOpen(false); }} title="Conectar dispositivo">
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
                  router.replace("/tvs");
                } catch (e) {
                  toast.error(e instanceof Error ? e.message : "Erro ao parear");
                }
              });
            }}
            className="space-y-3"
          >
            {codeFromQr && (
              <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/10 px-3 py-2.5 text-sm text-cyan-200">
                Código recebido pelo QR Code. Dê um nome à TV para concluir.
              </p>
            )}
            <Field
              key={codeFromQr ?? "manual-code"}
              label="Código exibido no dispositivo"
              name="code"
              required
              placeholder="A7K9-23QF"
              defaultValue={codeFromQr ?? undefined}
              readOnly={Boolean(codeFromQr)}
            />
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
      aria-label="Playlist padrão da TV"
      value={currentPlaylistId ?? ""}
      disabled={pending}
      onChange={(e) => { const value = e.target.value || null; start(async () => { try { await setTvPlaylist(tvId, value); toast.success("Playlist padrão atualizada."); } catch { toast.error("Não foi possível vincular a playlist."); } }); }}
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
        if (confirm("Excluir esta TV?")) start(async () => { try { await deleteTv(id); toast.success("TV excluída."); } catch { toast.error("Não foi possível excluir a TV."); } });
      }}
      className="text-red-400 text-sm hover:underline"
    >
      Excluir
    </button>
  );
}

export function RevokeTvButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  return <button disabled={pending} className="mr-3 text-sm text-amber-300 hover:underline" onClick={() => {
    if (confirm("Revogar o acesso desta TV? Ela precisará ser conectada novamente como um novo dispositivo. Este cadastro e sua programação serão mantidos.")) {
      start(async () => { try { await revokeTvAccess(id); toast.success("Acesso revogado."); } catch { toast.error("Não foi possível revogar o acesso."); } });
    }
  }}>{pending ? "Revogando…" : "Revogar acesso"}</button>;
}

function Field({
  label,
  name,
  required,
  placeholder,
  defaultValue,
  readOnly,
}: {
  label: string;
  name: string;
  required?: boolean;
  placeholder?: string;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="text-sm text-zinc-400 block mb-1">{label}</label>
      <input
        id={name}
        name={name}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className="w-full bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2.5 text-sm read-only:cursor-default read-only:text-zinc-400"
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
