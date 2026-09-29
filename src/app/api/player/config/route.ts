import { idSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tv, tvSchedule, playlist } from "@/db/schema";
import { resolveWeeklySchedule } from "@/lib/scheduling";
import { eq } from "drizzle-orm";
import { readPlaylistWithItems } from "@/lib/playlist-data";
import { playerAuthorized } from "@/lib/device-token";

// Player consulta config atual: playlist vinculada + versão (para detectar mudança)
export async function GET(req: NextRequest) {
  const tvId = req.nextUrl.searchParams.get("tvId");
  if (!tvId || !idSchema.safeParse(tvId).success) return NextResponse.json({ error: "tvId inválido" }, { status: 400 });

  const found = await db.query.tv.findFirst({
    columns: { paired: true, playlistId: true, deviceTokenHash: true },
    where: eq(tv.id, tvId),
  });
  if (!found) return NextResponse.json({ error: "TV não encontrada" }, { status: 404 });
  if (!playerAuthorized(req.headers, found.deviceTokenHash)) return NextResponse.json({ error: "Acesso do dispositivo inválido ou revogado" }, { status: 401 });
  if (!found.paired) return NextResponse.json({ paired: false });

  const schedules = await db.select().from(tvSchedule).where(eq(tvSchedule.tvId, tvId));
  const now = new Date();
  const { active, nextChangeAt } = resolveWeeklySchedule(schedules, now);
  const playlistId = active?.playlistId ?? found.playlistId;
  const timing = { serverNow: now.toISOString(), nextChangeAt, activeScheduleId: active?.id ?? null };
  const knownPlaylist = req.nextUrl.searchParams.get("knownPlaylist");
  if (playlistId && knownPlaylist) {
    const current = await db.query.playlist.findFirst({
      columns: { id: true, version: true }, where: eq(playlist.id, playlistId),
    });
    if (current && knownPlaylist === `${current.id}:${current.version}`) {
      return NextResponse.json({ paired: true, unchanged: true, ...timing }, { headers: { "Cache-Control": "no-store" } });
    }
  }
  const playlistData = playlistId ? await readPlaylistWithItems(playlistId) : null;
  return NextResponse.json({ paired: true, playlist: playlistData ?? null,
    ...timing,
  }, { headers: { "Cache-Control": "no-store" } });
}
