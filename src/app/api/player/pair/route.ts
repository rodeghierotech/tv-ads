import { idSchema } from "@/lib/validation";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tv } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { allowPlayerRegistration, registerTv } from "@/lib/player-registration";
import { deviceTokenMatches, hashDeviceToken, newDeviceToken, playerAuthorized } from "@/lib/device-token";

const noStore = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  if (!(await allowPlayerRegistration(req.headers))) {
    return NextResponse.json({ error: "Muitos registros. Tente novamente em alguns minutos." }, { status: 429, headers: { ...noStore, "Retry-After": "600" } });
  }
  const token = newDeviceToken();
  const created = await registerTv({ name: "Nova TV", deviceTokenHash: hashDeviceToken(token) });
  return NextResponse.json({ tvId: created.id, code: created.pairingCode, token }, { headers: noStore });
}

export async function GET(req: NextRequest) {
  const tvId = req.nextUrl.searchParams.get("tvId");
  if (!tvId || !idSchema.safeParse(tvId).success) return NextResponse.json({ error: "tvId inválido" }, { status: 400 });
  const found = await db.query.tv.findFirst({
    columns: { paired: true, pairingCode: true, deviceTokenHash: true }, where: eq(tv.id, tvId),
  });
  if (!found) return NextResponse.json({ error: "TV não encontrada" }, { status: 404 });
  const authorization = req.headers.get("authorization");
  const token = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  // Client persisted the proposed token before this request. Retrying a lost
  // response works with that same token and never needs an insecure reissue.
  if (found.deviceTokenHash === null && req.headers.get("x-player-upgrade") === "1" && process.env.PLAYER_ALLOW_LEGACY_AUTH !== "false" && token && /^[A-Za-z0-9_-]{43}$/.test(token)) {
    const [claimed] = await db.update(tv).set({ deviceTokenHash: hashDeviceToken(token) })
      .where(and(eq(tv.id, tvId), isNull(tv.deviceTokenHash))).returning({ id: tv.id });
    if (!claimed) {
      const current = await db.query.tv.findFirst({ columns: { deviceTokenHash: true }, where: eq(tv.id, tvId) });
      if (!deviceTokenMatches(token, current?.deviceTokenHash ?? null)) return NextResponse.json({ error: "Dispositivo atualizado por outra conexão. Tente novamente." }, { status: 409 });
    }
  } else if (!playerAuthorized(req.headers, found.deviceTokenHash)) {
    return NextResponse.json({ error: "Acesso inválido ou revogado" }, { status: 401 });
  }
  return NextResponse.json({ paired: found.paired, code: found.pairingCode }, { headers: noStore });
}
