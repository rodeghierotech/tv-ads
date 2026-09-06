"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { getSchedulePanelData } from "@/actions/schedule";
import { formatScheduleDate, resolveWeeklySchedule } from "@/lib/scheduling";

export type PanelData = Awaited<ReturnType<typeof getSchedulePanelData>>;

export function useScheduleData(initialData: PanelData) {
  const [data, setData] = useState(initialData);
  const [now, setNow] = useState(() => new Date(initialData.serverNow));
  const [stale, setStale] = useState(false);
  const mounted = useRef(false);
  const sequence = useRef(0);
  const anchor = useRef({ server: Date.parse(initialData.serverNow), client: 0 });
  const refresh = useCallback(async () => {
    const request = ++sequence.current;
    const fresh = await getSchedulePanelData();
    if (!mounted.current || request !== sequence.current) return;
    anchor.current = { server: Date.parse(fresh.serverNow), client: performance.now() };
    setData(fresh);
    setNow(new Date(fresh.serverNow));
    setStale(false);
  }, []);
  useEffect(() => {
    mounted.current = true;
    anchor.current = { server: Date.parse(initialData.serverNow), client: performance.now() };
    const clock = setInterval(() => setNow(new Date(anchor.current.server + performance.now() - anchor.current.client)), 1000);
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const poll = async () => {
      try { await refresh(); } catch { if (!stopped) setStale(true); }
      if (!stopped) timer = setTimeout(poll, 15000);
    };
    void poll();
    return () => { stopped = true; mounted.current = false; sequence.current++; clearInterval(clock); clearTimeout(timer); };
  }, [initialData.serverNow, refresh]);
  return { data, now, stale, refresh };
}

export function TvScheduleStatus({ data, tvId, now }: { data: PanelData; tvId: string; now: Date }) {
  const device = data.tvs.find((t) => t.id === tvId);
  const { active, next } = resolveWeeklySchedule(data.schedules.filter((s) => s.tvId === tvId), now);
  const name = (id: string | null | undefined) => data.playlists.find((p) => p.id === id)?.name ?? "Sem playlist";
  return <div className="grid gap-3 text-sm sm:grid-cols-2">
    <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/5 p-3">
      <p className="text-xs font-medium text-emerald-300">Agora · {active ? "Programação ativa" : "Playlist padrão"}</p>
      <p className="mt-1 font-medium">{active?.name ?? name(device?.playlistId)}</p>
      {active && <p className="mt-1 text-zinc-400">{name(active.playlistId)}</p>}
      {!device?.paired && <p className="mt-1 text-xs text-amber-300">TV aguardando pareamento</p>}
    </div>
    <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-3">
      <p className="text-xs font-medium text-cyan-300">Próxima programação</p>
      <p className="mt-1 font-medium">{next?.schedule.name ?? "Nenhum agendamento"}</p>
      {next && <p className="mt-1 text-zinc-400">{name(next.schedule.playlistId)} · {formatScheduleDate(next.startsAt)}</p>}
    </div>
  </div>;
}

export function ScheduleOverview({ initialData }: { initialData: PanelData }) {
  const { data, now, stale } = useScheduleData(initialData);
  return <section className="space-y-4 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-semibold">Programação das TVs</h2><p className="mt-1 text-sm text-zinc-400">Horários de São Paulo · programação prevista, independente da conexão da TV.</p></div><Link href="/programacao" className="text-sm text-cyan-300 underline">Gerenciar agenda</Link></div>
    {stale && <p role="status" className="text-sm text-amber-300">Sem atualização do servidor. Exibindo a última agenda recebida.</p>}
    {!data.tvs.length && <p className="text-sm text-zinc-400">Cadastre uma TV para começar.</p>}
    {data.tvs.map((t) => <div key={t.id}><h3 className="mb-2 text-sm font-medium">{t.name}</h3><TvScheduleStatus data={data} tvId={t.id} now={now} /></div>)}
  </section>;
}
