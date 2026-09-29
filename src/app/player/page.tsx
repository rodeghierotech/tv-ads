"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";

import { fetchJsonWithTimeout, fetchWithTimeout } from "@/lib/fetch-with-timeout";
import { playerConfigSchema, playerPairSchema, playerRegistrationSchema, type PlayerPlaylist } from "@/lib/player-contract";
import { idSchema } from "@/lib/validation";
import { ensureDeviceToken } from "@/lib/device-identity";

const DEVICE_KEY = "tv-ads-device-id";
const HEARTBEAT_INTERVAL = 30_000;
const SYNC_INTERVAL = 15_000;
const DEFAULT_IMAGE_DURATION = 10;

function playerHeaders(id: string): Record<string, string> {
  const token = localStorage.getItem(`${DEVICE_KEY}:token:${id}`);
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function PlayerPage() {
  const [tvId, setTvId] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [paired, setPaired] = useState(false);
  const [pairingUrl, setPairingUrl] = useState<string | null>(null);
  const [playlist, setPlaylist] = useState<PlayerPlaylist | null>(null);
  const [index, setIndex] = useState(0);
  const [playbackCycle, setPlaybackCycle] = useState(0);
  const versionRef = useRef<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const videoProgressRef = useRef(0);

  const registrationRef = useRef<Promise<{ tvId: string; code: string }> | null>(null);
  const [pairError, setPairError] = useState<string | null>(null);

  useEffect(() => {
    setPairingUrl(code ? `${window.location.origin}/tvs?pair=${encodeURIComponent(code)}` : null);
  }, [code]);

  useEffect(() => {
    if (paired) return;
    let stopped = false;
    let timer: ReturnType<typeof setTimeout>;
    const check = async () => {
      let retryDelay = 5000;
      try {
        let deviceId = localStorage.getItem(DEVICE_KEY);
        if (deviceId && !idSchema.safeParse(deviceId).success) {
          localStorage.removeItem(DEVICE_KEY);
          deviceId = null;
        }
        if (deviceId) {
          ensureDeviceToken(deviceId);
          const response = await fetchJsonWithTimeout('/api/player/pair?tvId=' + encodeURIComponent(deviceId), { cache: 'no-store', headers: { ...playerHeaders(deviceId), 'x-player-upgrade': '1' } });
          if (stopped) return;
          if (response.status === 404 || response.status === 401) {
            localStorage.removeItem(`${DEVICE_KEY}:token:${deviceId}`);
            localStorage.removeItem(DEVICE_KEY);
            deviceId = null;
            setTvId(null);
            setCode(null);
            setPlaylist(null);
            setIndex(0);
            versionRef.current = null;
          } else {
            if (!response.ok) throw new Error('Pareamento indisponível');
            const data = playerPairSchema.parse(response.data);
            if (data.token) localStorage.setItem(`${DEVICE_KEY}:token:${deviceId}`, data.token);
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
              const response = await fetchJsonWithTimeout('/api/player/pair', { method: 'POST' });
              if (response.status === 429) { retryDelay = 600000; throw new Error('Muitos registros. Uma nova tentativa será feita em 10 minutos.'); }
              if (!response.ok) throw new Error('Não foi possível registrar a TV');
              const data = playerRegistrationSchema.parse(response.data);
              localStorage.setItem(`${DEVICE_KEY}:token:${data.tvId}`, data.token);
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
        if (!stopped) setPairError(retryDelay === 600000 ? 'Muitos registros. Tentando novamente em 10 minutos…' : 'Não foi possível conectar. Tentando novamente em 5 segundos…');
      } finally {
        if (!stopped) timer = setTimeout(check, retryDelay);
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
        const known = versionRef.current;
        const response = await fetchJsonWithTimeout(`/api/player/config?tvId=${tvId}${known ? `&knownPlaylist=${encodeURIComponent(known)}` : ""}`, { cache: "no-store", signal: controller.signal, headers: playerHeaders(tvId) });
        if (stopped) return;
        if (response.status === 404 || response.status === 401) {
          // Return to pairing; that flow confirms the missing ID before replacing it.
          versionRef.current = null;
          setPlaylist(null);
          setIndex(0);
          setCode(null);
          setPaired(false);
          return;
        }
        if (!response.ok) throw new Error("Configuração indisponível");
        const data = playerConfigSchema.parse(response.data);
        if (stopped) return;
        if (data.paired === false) {
          versionRef.current = null;
          setPlaylist(null);
          setIndex(0);
          setPaired(false);
          return;
        }
        if ("playlist" in data) {
          const key = data.playlist ? `${data.playlist.id}:${data.playlist.version}` : null;
          if (key !== versionRef.current) {
            versionRef.current = key;
            setPlaylist(data.playlist);
            setIndex(0);
          }
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
    const controller = new AbortController();
    const beat = async () => { try { await fetchWithTimeout("/api/player/heartbeat", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...playerHeaders(tvId) },
      signal: controller.signal,
      body: JSON.stringify({ tvId }),
    }); } catch { /* Retry on the next heartbeat. */ } };
    beat();
    const interval = setInterval(beat, HEARTBEAT_INTERVAL);
    return () => { controller.abort(); clearInterval(interval); };
  }, [tvId, paired]);

  const currentItem = playlist?.items?.[index] ?? null;

  const advance = useCallback(() => {
    if (!playlist || playlist.items.length === 0) return;
    setIndex((i) => (i + 1) % playlist.items.length);
    setPlaybackCycle((cycle) => cycle + 1);
  }, [playlist]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    videoProgressRef.current = 0;
    if (currentItem?.media.type === "image") {
      const duration = currentItem.durationOverride ?? currentItem.media.duration ?? DEFAULT_IMAGE_DURATION;
      const seconds = duration > 0 && Number.isFinite(duration) ? Math.min(duration, 86400) : DEFAULT_IMAGE_DURATION;
      timerRef.current = setTimeout(advance, seconds * 1000);
    } else if (currentItem?.media.type === "video") {
      timerRef.current = setTimeout(advance, 30000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [currentItem, advance, playbackCycle]);

  if (!tvId || (!paired && !code)) {
    return <FullscreenMessage title={pairError ?? "Iniciando..."} />;
  }

  if (!paired) {
    return (
      <FullscreenMessage title="Este dispositivo ainda não está conectado">
        <p className="mx-auto max-w-md text-sm text-zinc-400">Escaneie o QR Code com o celular para abrir o pareamento no painel administrativo.</p>
        {pairingUrl && (
          <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-2xl shadow-cyan-950/30 sm:p-4">
            <QRCodeSVG
              value={pairingUrl}
              size={220}
              level="M"
              marginSize={1}
              bgColor="#ffffff"
              fgColor="#09090b"
              title="QR Code para conectar esta TV"
              className="h-44 w-44 sm:h-56 sm:w-56"
            />
          </div>
        )}
        <div className="flex items-center gap-3 text-xs font-medium uppercase tracking-[0.18em] text-zinc-500">
          <span className="h-px flex-1 bg-white/10" />
          ou use o código
          <span className="h-px flex-1 bg-white/10" />
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 px-6 py-4 font-mono text-3xl font-bold tracking-[0.28em] text-white sm:text-4xl">
          {code}
        </div>
        <p className="text-sm text-zinc-500">No painel, acesse TVs e escolha “Conectar dispositivo”.</p>
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
            key={`${currentItem.id}:${playbackCycle}`}
            src={currentItem.media.url}
            alt={currentItem.media.name}
            onError={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(advance, 3000); }}
            className="h-full w-full object-contain"
          />
        ) : currentItem ? (
          <video
            key={`${currentItem.id}:${playbackCycle}`}
            src={currentItem.media.url}
            className="h-full w-full object-contain"
            autoPlay
            muted
            playsInline
            onTimeUpdate={(event) => {
              const position = event.currentTarget.currentTime;
              if (position > videoProgressRef.current) {
                videoProgressRef.current = position;
                if (timerRef.current) clearTimeout(timerRef.current);
                timerRef.current = setTimeout(advance, 30000);
              }
            }}
            onError={() => { if (timerRef.current) clearTimeout(timerRef.current); timerRef.current = setTimeout(advance, 3000); }}
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
