import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tv } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(req: NextRequest) {
  const { tvId } = await req.json();
  if (!tvId) return NextResponse.json({ error: "tvId obrigatório" }, { status: 400 });
  await db.update(tv).set({ lastHeartbeat: new Date(), status: "online" }).where(eq(tv.id, tvId));
  return NextResponse.json({ ok: true });
}
