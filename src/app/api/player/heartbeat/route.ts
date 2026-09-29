import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tv } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { idSchema } from "@/lib/validation";
import { playerAuthorized } from "@/lib/device-token";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parsed = idSchema.safeParse(body?.tvId);
  if (!parsed.success) return NextResponse.json({ error: "tvId inválido" }, { status: 400 });
  const found = await db.query.tv.findFirst({ columns: { deviceTokenHash: true }, where: eq(tv.id, parsed.data) });
  if (!found) return NextResponse.json({ error: "TV não encontrada" }, { status: 404 });
  if (!playerAuthorized(req.headers, found.deviceTokenHash)) return NextResponse.json({ error: "Acesso inválido ou revogado" }, { status: 401 });
  const updated = await db.update(tv).set({ lastHeartbeat: new Date(), status: "online" })
    .where(and(eq(tv.id, parsed.data), eq(tv.paired, true))).returning({ id: tv.id });
  if (!updated.length) return NextResponse.json({ error: "TV não encontrada ou não pareada" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
