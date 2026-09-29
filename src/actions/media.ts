"use server";

import { db } from "@/db";
import { media, playlist, playlistItem } from "@/db/schema";
import { eq, inArray, sql } from "drizzle-orm";
import { uploadMediaFile } from "@/lib/media-storage";
import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/require-session";
import { idSchema, nameSchema } from "@/lib/validation";
import { z } from "zod";
import { MAX_MEDIA_BYTES, mediaKind } from "@/lib/media-validation";

export async function uploadMedia(formData: FormData) {
  await requireSession();
  const file = formData.get("file");
  if (!(file instanceof File) || !file.size) throw new Error("Selecione um arquivo válido.");
  if (file.size > MAX_MEDIA_BYTES) throw new Error("O arquivo deve ter no máximo 3 MB.");
  const type = mediaKind(file.type);
  if (!type) throw new Error("Formato de arquivo não suportado.");
  const name = nameSchema.parse(formData.get("name") || file.name);
  const duration = type === "image" ? z.coerce.number().int().min(1).max(86400).parse(formData.get("duration") || 10) : null;
  const url = await uploadMediaFile(file);
  const [created] = await db.insert(media).values({ name, type, url, duration }).returning({ id: media.id });
  revalidatePath("/conteudos");
  revalidatePath("/dashboard");
  return created;
}

export async function deleteMedia(id: string) {
  await requireSession();
  idSchema.parse(id);
  await db.transaction(async (tx) => {
    // Same lock order as adding an item: media, then playlists.
    const [found] = await tx.select({ id: media.id }).from(media).where(eq(media.id, id)).for("update");
    if (!found) return;
    const refs = await tx.select({ id: playlistItem.playlistId }).from(playlistItem).where(eq(playlistItem.mediaId, id));
    const ids = [...new Set(refs.map((r) => r.id))].sort();
    if (ids.length) {
      await tx.select({ id: playlist.id }).from(playlist).where(inArray(playlist.id, ids)).orderBy(playlist.id).for("update");
      await tx.update(playlist).set({ version: sql`${playlist.version} + 1`, updatedAt: new Date() }).where(inArray(playlist.id, ids));
    }
    await tx.delete(media).where(eq(media.id, id));
  });
  revalidatePath("/conteudos");
  revalidatePath("/playlists", "layout");
  revalidatePath("/dashboard");
  revalidatePath("/programacao");
}

export async function listMedia() {
  await requireSession();
  return db.query.media.findMany({ orderBy: (m, { desc }) => [desc(m.createdAt)] });
}

export async function listMediaOptions() {
  await requireSession();
  return db.query.media.findMany({ columns: { id: true, name: true, type: true }, orderBy: (m, { asc }) => [asc(m.name)] });
}
