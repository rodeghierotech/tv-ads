import { createHmac } from "node:crypto";
import { db } from "@/db";
import { tv, playerRateLimit } from "@/db/schema";
import { lt, sql } from "drizzle-orm";
import { generatePairingCode } from "@/lib/pairing";

export async function registerTv(values: { name: string; location?: string; deviceTokenHash?: string }) {
  // The unique constraint arbitrates collisions, including concurrent requests.
  for (let attempt = 0; attempt < 5; attempt++) {
    const [created] = await db.insert(tv).values({ ...values, pairingCode: generatePairingCode() })
      .onConflictDoNothing({ target: tv.pairingCode }).returning({ id: tv.id, pairingCode: tv.pairingCode });
    if (created) return created;
  }
  throw new Error("Não foi possível gerar um código. Tente novamente.");
}

export async function allowPlayerRegistration(headers: Headers) {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret || secret.length < 32) throw new Error("Configure BETTER_AUTH_SECRET com pelo menos 32 caracteres.");
  // Only trust the header set by the configured hosting platform; arbitrary
  // forwarded headers on a standalone server cannot bypass the shared bucket.
  const address = process.env.VERCEL === "1" ? headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() : null;
  const key = createHmac("sha256", secret).update(address || "shared-registration").digest("hex");
  await db.delete(playerRateLimit).where(lt(playerRateLimit.expiresAt, sql`now()`));
  const [bucket] = await db.insert(playerRateLimit).values({ key, count: 1, expiresAt: sql`now() + interval '10 minutes'` })
    .onConflictDoUpdate({ target: playerRateLimit.key, set: {
      count: sql`CASE WHEN ${playerRateLimit.expiresAt} <= now() THEN 1 ELSE LEAST(${playerRateLimit.count} + 1, 31) END`,
      expiresAt: sql`CASE WHEN ${playerRateLimit.expiresAt} <= now() THEN now() + interval '10 minutes' ELSE ${playerRateLimit.expiresAt} END`,
    } }).returning({ count: playerRateLimit.count });
  return bucket.count <= 30;
}
