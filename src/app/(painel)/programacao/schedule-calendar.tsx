"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { deleteSchedule, saveSchedule } from "@/actions/schedule";
import { CALENDAR_DAYS, WEEK_DAYS, findScheduleConflicts, formatMinute, parseTime, resolveWeeklySchedule, type WeeklySchedule } from "@/lib/scheduling";
import { type PanelData, TvScheduleStatus, useScheduleData } from "./schedule-status";

type Draft = { id?: string; name: string; playlistId: string; days: number[]; start: string; end: string };
const field = "mt-1 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-400";
const button = "rounded-lg border border-zinc-700 px-3 py-2 text-sm hover:bg-zinc-800 disabled:opacity-50";

export function ScheduleCalendar({ initialData }: { initialData: PanelData }) {
  const { data, now, stale, refresh } = useScheduleData(initialData);
  const [tvId, setTvId] = useState(initialData.tvs[0]?.id ?? "");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<string | null>(null);
  const editor = useRef<HTMLDivElement>(null);
  const schedules = data.schedules.filter((s) => s.tvId === tvId).sort((a, b) => a.startMinute - b.startMinute || a.name.localeCompare(b.name));
  const device = data.tvs.find((t) => t.id === tvId);
  const active = resolveWeeklySchedule(schedules, now).active;
  const conflicts = draft ? findScheduleConflicts({ id: draft.id, tvId, days: draft.days, startMinute: parseTime(draft.start), endMinute: parseTime(draft.end) }, schedules) : [];
  const playlistName = (id: string | null) => data.playlists.find((p) => p.id === id)?.name ?? "Sem playlist";
  const open = (schedule?: WeeklySchedule, duplicate = false, day = 1) => {
    setError(""); setDeleting(null);
    setDraft(schedule ? { id: duplicate ? undefined : schedule.id, name: schedule.name + (duplicate ? " (cópia)" : ""), playlistId: schedule.playlistId, days: [...schedule.days], start: formatMinute(schedule.startMinute), end: formatMinute(schedule.endMinute) } : { name: "", playlistId: data.playlists[0]?.id ?? "", days: [day], start: "09:00", end: "10:00" });
    requestAnimationFrame(() => { editor.current?.scrollIntoView({ behavior: "smooth", block: "center" }); editor.current?.querySelector("input")?.focus(); });
  };
  return <div className="space-y-6">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><h1 className="text-3xl font-semibold">Programação semanal</h1><p className="mt-2 text-sm text-zinc-400">Repita playlists nos dias e horários escolhidos. Fuso: America/Sao_Paulo.</p></div><button className="rounded-xl bg-cyan-300 px-4 py-2.5 text-sm font-semibold text-zinc-950 disabled:opacity-40" disabled={!device || !data.playlists.length || pending} onClick={() => open()}>+ Novo agendamento</button></header>
    {!data.tvs.length ? <p className="rounded-xl border border-dashed border-zinc-700 p-6">Você ainda não tem TVs. <Link className="text-cyan-300 underline" href="/tvs">Cadastrar TV</Link></p> : <label className="block max-w-md text-sm">TV<select className={field} value={tvId} disabled={pending} onChange={(e) => { setTvId(e.target.value); setDraft(null); setError(""); setDeleting(null); }}>{data.tvs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></label>}
    {stale && <p role="status" className="text-sm text-amber-300">Sem atualização do servidor. Exibindo a última agenda recebida.</p>}
    {device && <>
      <TvScheduleStatus data={data} tvId={tvId} now={now} />
      <p className="text-sm text-zinc-400">Fora dos blocos: <strong className="text-zinc-200">{playlistName(device.playlistId)}</strong>. <Link href="/tvs" className="text-cyan-300 underline">Alterar playlist padrão</Link></p>
      {!data.playlists.length && <p className="text-sm text-amber-300">Crie uma <Link href="/playlists" className="underline">playlist</Link> antes de agendar.</p>}
      {draft && <div ref={editor} className="rounded-2xl border border-cyan-400/30 bg-zinc-900 p-5">
        <h2 className="mb-4 font-semibold">{draft.id ? "Editar agendamento" : "Novo agendamento"}</h2>
        <form onSubmit={(event) => {
          event.preventDefault(); setError("");
          startTransition(async () => {
            try {
              const result = await saveSchedule({ id: draft.id, tvId, name: draft.name, playlistId: draft.playlistId, days: draft.days, startMinute: parseTime(draft.start), endMinute: parseTime(draft.end) });
              if (!result.ok) { setError(result.error); return; }
              setDraft(null); toast.success("Agendamento salvo.");
              try { await refresh(); } catch { toast.error("Salvo, mas não foi possível atualizar a agenda. Recarregue a página."); }
            } catch { setError("Não foi possível salvar. Confira sua conexão e tente novamente."); }
          });
        }}>
          <fieldset disabled={pending} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Nome<input required maxLength={100} className={field} value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} /></label><label className="text-sm">Playlist<select required className={field} value={draft.playlistId} onChange={(e) => setDraft({ ...draft, playlistId: e.target.value })}><option value="" disabled>Selecione</option>{data.playlists.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></label></div>
            <fieldset><legend className="mb-2 text-sm">Dias da semana</legend><div className="flex flex-wrap gap-2">{CALENDAR_DAYS.map((day) => <label key={day} className="flex items-center gap-2 rounded-lg border border-zinc-700 px-3 py-2 text-sm"><input type="checkbox" checked={draft.days.includes(day)} onChange={(e) => setDraft({ ...draft, days: e.target.checked ? [...draft.days, day] : draft.days.filter((d) => d !== day) })} />{WEEK_DAYS[day]}</label>)}</div></fieldset>
            <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm">Início<input type="time" required className={field} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} /></label><label className="text-sm">Fim<input type="text" inputMode="numeric" required pattern="([01][0-9]|2[0-3]):[0-5][0-9]|24:00" placeholder="18:00" className={field} value={draft.end} onChange={(e) => setDraft({ ...draft, end: e.target.value })} /></label></div>
            <p className="text-xs text-zinc-400">Use 24:00 para terminar no fim do dia. Para atravessar a meia-noite, crie dois blocos em dias consecutivos. Ao duplicar, ajuste o horário ou os dias antes de salvar.</p>
            {conflicts.length > 0 && <p role="alert" className="rounded-lg border border-rose-400/30 bg-rose-400/10 p-3 text-sm text-rose-200">Horário sobreposto: {conflicts.map((s) => `${s.name} (${formatMinute(s.startMinute)}–${formatMinute(s.endMinute)})`).join(", ")}. Ajuste os dias ou horários.</p>}
            {error && <p role="alert" className="text-sm text-rose-300">{error}</p>}
            <div className="flex gap-2"><button type="submit" disabled={pending || conflicts.length > 0} className="rounded-lg bg-cyan-300 px-4 py-2 text-sm font-semibold text-zinc-950 disabled:opacity-40">{pending ? "Salvando…" : "Salvar agendamento"}</button><button type="button" className={button} onClick={() => setDraft(null)}>Cancelar</button></div>
          </fieldset>
        </form>
      </div>}
      <p className="text-xs text-zinc-400 lg:hidden">Deslize o calendário para ver todos os dias.</p>
      <section tabIndex={0} className="overflow-x-auto rounded-2xl border border-zinc-800 bg-zinc-900/60" aria-label="Calendário semanal">
        <div className="grid min-w-[980px] grid-cols-7 divide-x divide-zinc-800">{CALENDAR_DAYS.map((day) => <div key={day} className="min-w-0">
          <h2 className="border-b border-zinc-800 bg-zinc-950/60 p-3 text-sm font-semibold">{WEEK_DAYS[day]}</h2>
          <div className="min-h-64 space-y-2 p-2">{schedules.filter((s) => s.days.includes(day)).map((s) => <button key={s.id} disabled={pending} onClick={() => open(s)} className={`block w-full rounded-lg border p-3 text-left text-xs ${conflicts.some((c) => c.id === s.id) ? "border-rose-400 bg-rose-400/10" : active?.id === s.id ? "border-emerald-400/50 bg-emerald-400/10" : "border-cyan-400/20 bg-cyan-400/5 hover:bg-cyan-400/10"}`}><span className="text-cyan-200">{formatMinute(s.startMinute)}–{formatMinute(s.endMinute)}</span><strong className="mt-2 block break-words text-sm">{s.name}</strong><span className="mt-1 block break-words text-zinc-400">{playlistName(s.playlistId)}</span></button>)}<button disabled={pending || !data.playlists.length} onClick={() => open(undefined, false, day)} className="w-full rounded-lg border border-dashed border-zinc-700 p-3 text-xs text-zinc-400 hover:text-white disabled:opacity-40" aria-label={`Adicionar agendamento em ${WEEK_DAYS[day]}`}>+ Adicionar</button></div>
        </div>)}</div>
      </section>
      <section className="space-y-3"><h2 className="font-semibold">Agendamentos · {schedules.length}</h2>{!schedules.length && <p className="text-sm text-zinc-400">Sem blocos programados. A TV usa a playlist padrão.</p>}{schedules.map((s) => <article key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4"><div><h3 className="font-medium">{s.name}</h3><p className="mt-1 text-sm text-zinc-400">{playlistName(s.playlistId)} · {s.days.map((d) => WEEK_DAYS[d]).join(", ")} · {formatMinute(s.startMinute)}–{formatMinute(s.endMinute)}</p></div><div className="flex flex-wrap gap-2">{deleting === s.id ? <><span className="self-center text-sm text-rose-300">Excluir este agendamento?</span><button disabled={pending} className={button} onClick={() => startTransition(async () => { try { await deleteSchedule(s.id, tvId); setDeleting(null); if (draft?.id === s.id) setDraft(null); toast.success("Agendamento excluído."); await refresh(); } catch { toast.error("Não foi possível concluir a atualização. Recarregue a agenda."); } })}>Confirmar exclusão</button><button disabled={pending} className={button} onClick={() => setDeleting(null)}>Cancelar</button></> : <><button disabled={pending} className={button} onClick={() => open(s)}>Editar</button><button disabled={pending} className={button} onClick={() => open(s, true)}>Duplicar</button><button disabled={pending} className={button + " text-rose-300"} onClick={() => setDeleting(s.id)}>Excluir</button></>}</div></article>)}</section>
    </>}
  </div>;
}
