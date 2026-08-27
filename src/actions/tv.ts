"use server";

import { db } from "@/db";
import { tv } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generatePairingCode, HEARTBEAT_TIMEOUT_MS } from "@/lib/pairing";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const tvSchema = z.object({
  name: z.string().min(1),
  location: z.string().optional(),
});

export async function createTv(input: z.infer<typeof tvSchema>) {
  const data = tvSchema.parse(input);
  let code = generatePairingCode();
  // garante unicidade
  while (await db.query.tv.findFirst({ where: eq(tv.pairingCode, code) })) {
    code = generatePairingCode();
  }
  const [created] = await db.insert(tv).values({ ...data, pairingCode: code }).returning();
  revalidatePath("/tvs");
  return created;
}

export async function updateTv(id: string, input: Partial<z.infer<typeof tvSchema>>) {
  await db.update(tv).set(input).where(eq(tv.id, id));
  revalidatePath("/tvs");
}

export async function deleteTv(id: string) {
  await db.delete(tv).where(eq(tv.id, id));
  revalidatePath("/tvs");
}

export async function setTvPlaylist(id: string, playlistId: string | null) {
  await db.update(tv).set({ playlistId }).where(eq(tv.id, id));
  revalidatePath("/tvs");
  revalidatePath("/dashboard");
}

export async function pairTvByCode(code: string, name: string, location?: string) {
  const found = await db.query.tv.findFirst({ where: eq(tv.pairingCode, code.toUpperCase()) });
  if (!found) throw new Error("Código de pareamento inválido");
  if (found.paired) throw new Error("Esta TV já está pareada");
  await db.update(tv).set({ paired: true, name, location }).where(eq(tv.id, found.id));
  revalidatePath("/tvs");
  return found;
}

// Calcula status real (online/offline) com base no último heartbeat
export function computeTvStatus(lastHeartbeat: Date | null): "online" | "offline" {
  if (!lastHeartbeat) return "offline";
  return Date.now() - lastHeartbeat.getTime() < HEARTBEAT_TIMEOUT_MS ? "online" : "offline";
}

export async function listTvsWithStatus() {
  const tvs = await db.query.tv.findMany({
    with: { playlist: true },
    orderBy: (t, { asc }) => [asc(t.createdAt)],
  });
  return tvs.map((t) => ({ ...t, status: computeTvStatus(t.lastHeartbeat) }));
}
