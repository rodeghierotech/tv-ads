"use client";
export default function PanelError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return <div role="alert" className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900 p-6"><h2 className="text-lg font-semibold">Não foi possível carregar esta página.</h2><p className="text-sm text-zinc-400">Tente novamente. Se o problema continuar, confira sua conexão ou entre novamente.</p><button onClick={reset} className="rounded-lg bg-white px-4 py-2 text-sm text-black">Tentar novamente</button></div>;
}
