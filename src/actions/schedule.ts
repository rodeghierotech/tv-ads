"use server";

import { db } from "@/db";
import { playlist, tv, tvSchedule } from "@/db/schema";
import { requireSession } from "@/lib/require-session";
import { findScheduleConflicts, formatMinute, WEEK_DAYS } from "@/lib/scheduling";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const inputSchema = z.object({
  id: z.string().uuid().optional(),
  tvId: z.string().uuid(),
  playlistId: z.string().uuid(),
  name: z.string().trim().min(1, "Informe um nome.").max(100),
  days: z.array(z.number().int().min(0).max(6)).min(1).max(7).transform((days) => [...new Set(days)].sort()),
  startMinute: z.number().int().min(0).max(1439),
  endMinute: z.number().int().min(1).max(1440),
}).refine((s) => s.startMinute < s.endMinute, { message: "O fim deve ser posterior ao início. Para atravessar a meia-noite, crie dois blocos." });

function refreshSchedulePages() {
  for (const path of ["/programacao", "/dashboard", "/tvs"]) revalidatePath(path);
}

export async function getSchedulePanelData() {
  await requireSession();
  const [tvs, playlists, schedules] = await Promise.all([
    db.query.tv.findMany({ columns: { id: true, name: true, playlistId: true, paired: true }, orderBy: (t, { asc }) => [asc(t.name)] }),
    db.query.playlist.findMany({ columns: { id: true, name: true }, orderBy: (p, { asc }) => [asc(p.name)] }),
    db.select({ id: tvSchedule.id, tvId: tvSchedule.tvId, playlistId: tvSchedule.playlistId, name: tvSchedule.name,
      days: tvSchedule.days, startMinute: tvSchedule.startMinute, endMinute: tvSchedule.endMinute }).from(tvSchedule),
  ]);
  return { tvs, playlists, schedules, serverNow: new Date().toISOString() };
}

export async function saveSchedule(input: z.input<typeof inputSchema>) {
  await requireSession();
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0].message, conflictIds: [] as string[] };
  const data = parsed.data;
  const result = await db.transaction(async (tx) => {
    // Playlist deletions lock the playlist before cascading to TVs/schedules.
    const [target] = await tx.select({ id: playlist.id }).from(playlist).where(eq(playlist.id, data.playlistId)).for("key share");
    if (!target) return { ok: false as const, error: "Playlist não encontrada. Atualize a página.", conflictIds: [] as string[] };
    // Serialize all schedule edits for this TV, including simultaneous submissions.
    const [device] = await tx.select({ id: tv.id }).from(tv).where(eq(tv.id, data.tvId)).for("update");
    if (!device) return { ok: false as const, error: "TV não encontrada.", conflictIds: [] as string[] };
    const existing = await tx.select().from(tvSchedule).where(eq(tvSchedule.tvId, data.tvId));
    if (data.id && !existing.some((s) => s.id === data.id)) {
      return { ok: false as const, error: "Agendamento não encontrado. Atualize a página.", conflictIds: [] as string[] };
    }
    const conflicts = findScheduleConflicts(data, existing);
    if (conflicts.length) {
      return { ok: false as const, error: `Conflito com ${conflicts.map((s) => `“${s.name}” (${s.days.filter((d) => data.days.includes(d)).map((d) => WEEK_DAYS[d]).join(", ")}, ${formatMinute(s.startMinute)}–${formatMinute(s.endMinute)})`).join("; ")}.`, conflictIds: conflicts.map((s) => s.id) };
    }
    const { id, ...values } = data;
    if (id) {
      await tx.update(tvSchedule).set({ ...values, updatedAt: new Date() }).where(and(eq(tvSchedule.id, id), eq(tvSchedule.tvId, data.tvId)));
    } else {
      await tx.insert(tvSchedule).values(values);
    }
    return { ok: true as const };
  });
  if (result.ok) refreshSchedulePages();
  return result;
}

export async function deleteSchedule(id: string, tvId: string) {
  await requireSession();
  z.string().uuid().parse(id);
  z.string().uuid().parse(tvId);
  await db.transaction(async (tx) => {
    await tx.select({ id: tv.id }).from(tv).where(eq(tv.id, tvId)).for("update");
    await tx.delete(tvSchedule).where(and(eq(tvSchedule.id, id), eq(tvSchedule.tvId, tvId)));
  });
  refreshSchedulePages();
}
