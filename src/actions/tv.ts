"use server";

import { db } from "@/db";
import { tv } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { registerTv } from "@/lib/player-registration";
import { hashDeviceToken, newDeviceToken } from "@/lib/device-token";
import { computeTvStatus } from "@/lib/tv-status";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { requireSession } from "@/lib/require-session";
import { idSchema, nameSchema } from "@/lib/validation";

const tvSchema = z.object({
  name: nameSchema,
  location: z.string().trim().max(200).optional(),
});

function refreshTvPages() {
  for (const path of ["/tvs", "/dashboard", "/programacao"]) revalidatePath(path);
}

export async function createTv(input: z.infer<typeof tvSchema>) {
  await requireSession();
  const data = tvSchema.parse(input);
  const created = await registerTv(data);
  refreshTvPages();
  return created;
}

export async function revokeTvAccess(id: string) {
  await requireSession();
  idSchema.parse(id);
  // Retain the TV, its assignments and schedule. No client knows the replacement token.
  await db.update(tv).set({ deviceTokenHash: hashDeviceToken(newDeviceToken()), paired: false, lastHeartbeat: null, status: "offline" })
    .where(eq(tv.id, id));
  refreshTvPages();
}

export async function deleteTv(id: string) {
  await requireSession();
  idSchema.parse(id);
  await db.delete(tv).where(eq(tv.id, id));
  refreshTvPages();
}

export async function setTvPlaylist(id: string, playlistId: string | null) {
  await requireSession();
  idSchema.parse(id);
  idSchema.nullable().parse(playlistId);
  const [updated] = await db.update(tv).set({ playlistId }).where(eq(tv.id, id)).returning({ id: tv.id });
  if (!updated) throw new Error("TV não encontrada. Atualize a página.");
  refreshTvPages();
}

export async function pairTvByCode(code: string, name: string, location?: string) {
  await requireSession();
  const data = tvSchema.parse({ name, location });
  const normalized = z.string().trim().transform((value) => value.toUpperCase().replace(/-/g, "")).pipe(z.string().regex(/^[2-9A-HJ-NP-Z]{8}$/, "Código de pareamento inválido")).parse(code);
  const formatted = normalized.slice(0, 4) + "-" + normalized.slice(4);
  const [found] = await db.update(tv).set({ paired: true, ...data })
    .where(and(eq(tv.pairingCode, formatted), eq(tv.paired, false))).returning({ id: tv.id });
  if (!found) throw new Error("Código inválido ou dispositivo já conectado.");
  refreshTvPages();
  return found;
}

export async function listTvsWithStatus() {
  await requireSession();
  const tvs = await db.query.tv.findMany({
    columns: { deviceTokenHash: false },
    with: { playlist: true },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return tvs.map((t) => ({ ...t, status: computeTvStatus(t.lastHeartbeat) }));
}
