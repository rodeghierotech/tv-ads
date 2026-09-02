import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tv } from "@/db/schema";
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

  if (!found.playlistId) {
    return NextResponse.json({ paired: true, playlist: null });
  }

  const playlistData = await getPlaylistWithItems(found.playlistId);
  return NextResponse.json({ paired: true, playlist: playlistData });
}
