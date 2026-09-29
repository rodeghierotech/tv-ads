"use client";
import { useEffect, useId, useRef } from "react";

export function Modal({ children, onClose, title }: { children: React.ReactNode; onClose: () => void; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return <dialog ref={ref} aria-labelledby={titleId} onCancel={(event) => { event.preventDefault(); onClose(); }} onClick={(event) => { if (event.target === event.currentTarget) { const box = event.currentTarget.getBoundingClientRect(); if (event.clientX < box.left || event.clientX > box.right || event.clientY < box.top || event.clientY > box.bottom) onClose(); } }} className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-sm overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-900 p-5 text-zinc-100 backdrop:bg-black/60">
    <div className="mb-4 flex items-center justify-between gap-3"><h2 id={titleId} className="text-lg font-semibold">{title}</h2><button type="button" onClick={onClose} aria-label="Fechar janela" className="rounded-lg px-3 py-2 text-zinc-400 hover:bg-zinc-800">×</button></div>
    {children}
  </dialog>;
}
