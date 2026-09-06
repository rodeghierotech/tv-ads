import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tv, tvSchedule } from "@/db/schema";
import { resolveWeeklySchedule } from "@/lib/scheduling";
import { eq } from "drizzle-orm";
import { getPlaylistWithItems } from "@/actions/playlist";

// Player consulta config atual: playlist vinculada + versão (para detectar mudança)
export async function GET(req: NextRequest) {
  const tvId = req.nextUrl.searchParams.get("tvId");
  if (!tvId) return NextResponse.json({ error: "tvId obrigatório" }, { status: 400 });

  const found = await db.query.tv.findFirst({
    columns: { paired: true, playlistId: true },
    where: eq(tv.id, tvId),
  });
  if (!found) return NextResponse.json({ error: "TV não encontrada" }, { status: 404 });
  if (!found.paired) return NextResponse.json({ paired: false });

  const schedules = await db.select().from(tvSchedule).where(eq(tvSchedule.tvId, tvId));
  const now = new Date();
  const { active, nextChangeAt } = resolveWeeklySchedule(schedules, now);
  const playlistId = active?.playlistId ?? found.playlistId;
  const playlistData = playlistId ? await getPlaylistWithItems(playlistId) : null;
  return NextResponse.json({ paired: true, playlist: playlistData ?? null,
    serverNow: now.toISOString(), nextChangeAt, activeScheduleId: active?.id ?? null,
  }, { headers: { "Cache-Control": "no-store" } });
}
