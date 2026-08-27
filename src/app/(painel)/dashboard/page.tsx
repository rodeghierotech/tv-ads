import { db } from "@/db";
import { media, playlist } from "@/db/schema";
import { listTvsWithStatus } from "@/actions/tv";
import { count, eq } from "drizzle-orm";

export default async function DashboardPage() {
  const [tvs, [{ imgCount }], [{ vidCount }], [{ playlistCount }]] = await Promise.all([
    listTvsWithStatus(),
    db.select({ imgCount: count() }).from(media).where(eq(media.type, "image")),
    db.select({ vidCount: count() }).from(media).where(eq(media.type, "video")),
    db.select({ playlistCount: count() }).from(playlist),
  ]);

  const online = tvs.filter((t) => t.status === "online").length;
  const offline = tvs.length - online;

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-semibold">Dashboard</h1>

      <div className="grid grid-cols-3 gap-4">
        <StatCard title="TVs" rows={[["Total", tvs.length], ["Online", online], ["Offline", offline]]} />
        <StatCard title="Conteúdos" rows={[["Imagens", imgCount], ["Vídeos", vidCount]]} />
        <StatCard title="Playlists" rows={[["Total", playlistCount]]} />
      </div>

      <div className="border border-zinc-800 rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-900 text-zinc-400 text-left">
            <tr>
              <th className="p-3">TV</th>
              <th className="p-3">Local</th>
              <th className="p-3">Status</th>
              <th className="p-3">Playlist</th>
            </tr>
          </thead>
          <tbody>
            {tvs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-6 text-center text-zinc-500">
                  Nenhuma TV cadastrada ainda.
                </td>
              </tr>
            )}
            {tvs.map((t) => (
              <tr key={t.id} className="border-t border-zinc-800">
                <td className="p-3">{t.name}</td>
                <td className="p-3 text-zinc-400">{t.location || "—"}</td>
                <td className="p-3">
                  {t.status === "online" ? (
                    <span className="text-green-400">🟢 Online</span>
                  ) : (
                    <span className="text-red-400">🔴 Offline</span>
                  )}
                </td>
                <td className="p-3 text-zinc-400">{t.playlist?.name ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function StatCard({ title, rows }: { title: string; rows: [string, number][] }) {
  return (
    <div className="border border-zinc-800 rounded-lg p-4 bg-zinc-900">
      <div className="text-sm text-zinc-400 mb-3">{title}</div>
      <div className="space-y-1">
        {rows.map(([label, value]) => (
          <div key={label} className="flex justify-between text-sm">
            <span className="text-zinc-400">{label}</span>
            <span className="font-semibold">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
