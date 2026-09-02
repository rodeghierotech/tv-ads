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
  const versionRef = useRef<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(DEVICE_KEY);
    if (stored) {
      setTvId(stored);
    } else {
      fetch("/api/player/pair", { method: "POST" })
        .then((r) => r.json())
        .then((data) => {
          localStorage.setItem(DEVICE_KEY, data.tvId);
          setTvId(data.tvId);
          setCode(data.code);
        });
    }
  }, []);

  useEffect(() => {
    if (!tvId || paired) return;
    const check = () =>
      fetch(`/api/player/pair?tvId=${tvId}`)
        .then((r) => r.json())
        .then((data) => {
          setCode(data.code);
          if (data.paired) setPaired(true);
        });
    check();
    const interval = setInterval(check, 5000);
    return () => clearInterval(interval);
  }, [tvId, paired]);

  const syncConfig = useCallback(() => {
    if (!tvId) return;
    fetch(`/api/player/config?tvId=${tvId}`)
      .then((r) => r.json())
      .then((data) => {
        if (!data.paired) {
          setPaired(false);
          return;
        }
        setPaired(true);
        if (data.playlist && data.playlist.version !== versionRef.current) {
          versionRef.current = data.playlist.version;
          setPlaylist(data.playlist);
          setIndex(0);
        } else if (!data.playlist) {
          setPlaylist(null);
        }
      });
  }, [tvId]);

  useEffect(() => {
    if (!tvId || !paired) return;
    syncConfig();
    const interval = setInterval(syncConfig, SYNC_INTERVAL);
    return () => clearInterval(interval);
  }, [tvId, paired, syncConfig]);

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
    return <FullscreenMessage title="Iniciando..." />;
  }

  if (!paired) {
    return (
      <FullscreenMessage title="Este dispositivo ainda não está conectado">
        <p className="mb-5 max-w-md text-sm text-zinc-400">Digite este código no painel administrativo para conectar esta TV.</p>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 text-4xl font-mono font-bold tracking-[0.35em] text-white sm:text-5xl">
          {code}
        </div>
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
