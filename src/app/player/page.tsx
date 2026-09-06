"use client";

import { useEffect, useRef, useState, useCallback } from "react";

const DEVICE_KEY = "tv-ads-device-id";
const HEARTBEAT_INTERVAL = 30_000;
const SYNC_INTERVAL = 15_000;
const DEFAULT_IMAGE_DURATION = 10;

type MediaItem = {
  id: string;
  media: { id: string; type: "image" | "video"; url: string; name: string; duration: number | null };
  durationOverride: number | null;
};

type PlaylistData = {
  id: string;
  version: number;
  items: MediaItem[];
} | null;

export default function PlayerPage() {
  const [tvId, setTvId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [paired, setPaired] = useState(false);
  const [playlist, setPlaylist] = useState<PlaylistData>(null);
  const [index, setIndex] = useState(0);
  const versionRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const registrationRef = useRef<Promise<{ tvId: string; code: string }> | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);

  useEffect(() => {
    if (paired) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      try {
        let deviceId = localStorage.getItem(DEVICE_KEY);
        if (deviceId) {
          const response = await fetch('/api/player/pair?tvId=' + encodeURIComponent(deviceId), { cache: 'no-store' });
          if (stopped) return;
          if (response.status === 404) {
            localStorage.removeItem(DEVICE_KEY);
            deviceId = null;
            setTvId(null);
            setCode(null);
            setPlaylist(null);
            setIndex(0);
            versionRef.current = null;
          } else {
            if (!response.ok) throw new Error('Pareamento indisponível');
            const data = await response.json();
            if (stopped) return;
            setTvId(deviceId);
            setCode(data.code);
            setPaired(data.paired === true);
            setPairError(null);
            return;
          }
        }
        if (!deviceId) {
          // Share an in-flight registration across development effect replays.
          if (!registrationRef.current) {
            registrationRef.current = (async () => {
              const response = await fetch('/api/player/pair', { method: 'POST' });
              if (!response.ok) throw new Error('Não foi possível registrar a TV');
              const data = await response.json();
              if (typeof data.tvId !== 'string' || typeof data.code !== 'string') throw new Error('Resposta inválida');
              localStorage.setItem(DEVICE_KEY, data.tvId);
              return data as { tvId: string; code: string };
            })();
          }
          const registration = registrationRef.current;
          let data: { tvId: string; code: string };
          try { data = await registration; }
          finally { if (registrationRef.current === registration) registrationRef.current = null; }
          if (stopped) return;
          setTvId(data.tvId);
          setCode(data.code);
          setPairError(null);
        }
      } catch {
        if (!stopped) setPairError('Não foi possível conectar. Tentando novamente em 5 segundos…');
      } finally {
        if (!stopped) timer = setTimeout(check, 5000);
      }
    };
    void check();
    return () => { stopped = true; clearTimeout(timer); };
  }, [paired]);

  useEffect(() => {
    if (!tvId || !paired) return;
    let stopped = false;
    let timeout: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    const sync = async () => {
      let delay = SYNC_INTERVAL;
      const started = performance.now();
      try {
        const response = await fetch(`/api/player/config?tvId=${tvId}`, { cache: "no-store", signal: controller.signal });
        if (stopped) return;
        if (response.status === 404) {
          // Return to pairing; that flow confirms the missing ID before replacing it.
          versionRef.current = null;
          setPlaylist(null);
          setIndex(0);
          setCode(null);
          setPaired(false);
          return;
        }
        if (!response.ok) throw new Error("Configuração indisponível");
        const data = await response.json();
        if (stopped) return;
        if (data.paired === false) {
          versionRef.current = null;
          setPlaylist(null);
          setIndex(0);
          setPaired(false);
          return;
        }
        const key = data.playlist ? `${data.playlist.id}:${data.playlist.version}` : null;
        if (key !== versionRef.current) {
          versionRef.current = key;
          setPlaylist(data.playlist);
          setIndex(0);
        }
        if (data.nextChangeAt && data.serverNow) {
          const remaining = Date.parse(data.nextChangeAt) - Date.parse(data.serverNow) - (performance.now() - started);
          if (Number.isFinite(remaining)) delay = Math.max(250, Math.min(SYNC_INTERVAL, remaining));
        }
      } catch {
        // Keep the current playlist during temporary connection failures.
      } finally {
        if (!stopped) timeout = setTimeout(sync, delay);
      }
    };
    void sync();
    return () => { stopped = true; controller.abort(); clearTimeout(timeout); };
  }, [tvId, paired]);

  useEffect(() => {
    if (!tvId || !paired) return;
    const beat = () => fetch("/api/player/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tvId }),
    });
    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [tvId, paired]);

  const currentItem = playlist?.items?.[index] ?? null;

  const advance = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;
    setIndex((i) => (i + 1) % playlist.items.length);
  }, [playlist]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (!currentItem || currentItem.media.type !== "image") return;
    const seconds = currentItem.durationOverride ?? currentItem.media.duration ?? DEFAULT_IMAGE_DURATION;
    timerRef.current = setTimeout(advance, seconds * 1000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItem, advance]);

  if (!tvId || (!paired && !code)) {
    return <FullscreenMessage title={pairError ?? "Iniciando..."} />;
  }

  if (!paired) {
    return (
      <FullscreenMessage title="Este dispositivo ainda não está conectado">
        <p className="mb-5 max-w-md text-sm text-zinc-400">Digite este código no painel administrativo para conectar esta TV.</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-4xl font-mono font-bold tracking-[0.35em] text-white sm:text-5xl">
          {code}
        </div>
        {pairError && <p role="status" className="text-sm text-amber-300">{pairError}</p>}
      </FullscreenMessage>
    );
  }

  if (!playlist || playlist.items.length === 0) {
    return <FullscreenMessage title="Nenhuma playlist vinculada a esta TV" />;
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-[#020617]">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(24,24,27,0.32),rgba(2,6,23,0.88)_62%)]" />
      <div className="relative h-full w-full">
        {currentItem && currentItem.media.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            key={currentItem.id}
            src={currentItem.media.url}
            alt={currentItem.media.name}
            className="h-full w-full object-contain"
          />
        ) : currentItem ? (
          <video
            key={currentItem.id}
            src={currentItem.media.url}
            className="h-full w-full object-contain"
            autoPlay
            muted
            onEnded={advance}
          />
        ) : null}
      </div>
    </div>
  );
}

function FullscreenMessage({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center bg-[#050816] px-6 py-10 text-center text-white">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(30,41,59,0.35),rgba(2,6,23,0.9)_58%)]" />
      <div className="relative space-y-4">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">{title}</h1>
        {children}
      </div>
    </div>
  );
}
