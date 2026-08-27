import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generatePairingCode } from "@/lib/pairing";

// Player pede um código novo (primeiro acesso, sem TV ainda cadastrada)
export async function POST() {
  let code = generatePairingCode();
  while (await db.query.tv.findFirst({ where: eq(tv.pairingCode, code) })) {
    code = generatePairingCode();
  }
  const [created] = await db
    .insert(tv)
    .values({ name: "Nova TV", pairingCode: code, paired: false })
    .returning();
  return NextResponse.json({ tvId: created.id, code: created.pairingCode });
}

// Player consulta se já foi pareado (paired = true no painel)
export async function GET(req: NextRequest) {
  const tvId = req.nextUrl.searchParams.get("tvId");
  if (!tvId) return NextResponse.json({ error: "tvId obrigatório" }, { status: 400 });
  const found = await db.query.tv.findFirst({ where: eq(tv.id, tvId) });
  if (!found) return NextResponse.json({ error: "TV não encontrada" }, { status: 404 });
  return NextResponse.json({ paired: found.paired, code: found.pairingCode });
}
