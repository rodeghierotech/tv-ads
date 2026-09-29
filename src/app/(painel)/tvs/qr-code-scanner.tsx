"use client";

import { useEffect, useRef, useState } from "react";
import type { IScannerControls } from "@zxing/browser";

export function QrCodeScanner({ onScan, onCancel }: { onScan: (code: string) => void; onCancel: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function startScanner() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setError("A câmera exige uma conexão HTTPS. Use o código manual neste acesso.");
        return;
      }

      try {
        const { BrowserQRCodeReader } = await import("@zxing/browser");
        if (!active || !videoRef.current) return;

        const reader = new BrowserQRCodeReader(undefined, { delayBetweenScanAttempts: 200 });
        controlsRef.current = await reader.decodeFromConstraints(
          { audio: false, video: { facingMode: { ideal: "environment" } } },
          videoRef.current,
          (result, _error, controls) => {
            if (!active || !result) return;
            const code = extractPairingCode(result.getText());
            if (!code) {
              setError("Este QR Code não contém um código válido de conexão de TV.");
              return;
            }
            active = false;
            controls.stop();
            onScan(code);
          },
        );
      } catch (caught) {
        if (!active) return;
        const name = caught instanceof Error ? caught.name : "";
        setError(
          name === "NotAllowedError"
            ? "Permita o acesso à câmera para escanear o QR Code."
            : name === "NotFoundError"
              ? "Nenhuma câmera foi encontrada neste dispositivo."
              : "Não foi possível abrir a câmera. Use o código manual.",
        );
      }
    }

    void startScanner();
    return () => {
      active = false;
      controlsRef.current?.stop();
      const stream = videoRef.current?.srcObject;
      if (stream instanceof MediaStream) stream.getTracks().forEach((track) => track.stop());
    };
  }, [onScan]);

  return (
    <div className="space-y-3 rounded-xl border border-cyan-500/20 bg-zinc-950 p-3">
      <div className="relative aspect-square overflow-hidden rounded-lg bg-black">
        <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
        <div className="pointer-events-none absolute inset-[12%] rounded-2xl border-2 border-cyan-300/80 shadow-[0_0_0_999px_rgba(0,0,0,0.35)]" />
      </div>
      <p className="text-center text-xs text-zinc-400">Aponte a câmera para o QR Code exibido na TV.</p>
      {error && <p role="alert" className="text-sm text-amber-300">{error}</p>}
      <button type="button" onClick={onCancel} className="w-full rounded-xl border border-zinc-700 px-3 py-2.5 text-sm">
        Cancelar leitura
      </button>
    </div>
  );
}

function extractPairingCode(value: string) {
  let candidate = value.trim();
  try {
    candidate = new URL(candidate, "https://tv-ads.invalid").searchParams.get("pair") ?? candidate;
  } catch {
    // A raw pairing code is also accepted.
  }
  const normalized = candidate.toUpperCase().replace(/-/g, "");
  return /^[2-9A-HJ-NP-Z]{8}$/.test(normalized)
    ? `${normalized.slice(0, 4)}-${normalized.slice(4)}`
    : null;
}
