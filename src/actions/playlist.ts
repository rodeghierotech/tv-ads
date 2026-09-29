"use server";

import { db } from "@/db";
import { playlist, playlistItem, media } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireSession } from "@/lib/require-session";
import { idSchema, nameSchema, isExactItemOrder } from "@/lib/validation";
import { readPlaylistWithItems } from "@/lib/playlist-data";

function refreshPlaylists() {
  revalidatePath("/playlists", "layout");
  for (const path of ["/tvs", "/dashboard", "/programacao"]) revalidatePath(path);
}

export async function createPlaylist(name: string) {
  await requireSession();
  const [created] = await db.insert(playlist).values({ name: nameSchema.parse(name) }).returning();
  refreshPlaylists();
  return created;
}

export async function deletePlaylist(id: string) {
  await requireSession();
  idSchema.parse(id);
  await db.delete(playlist).where(eq(playlist.id, id));
  refreshPlaylists();
}

export async function addItemToPlaylist(playlistId: string, mediaId: string) {
  await requireSession();
  idSchema.parse(playlistId); idSchema.parse(mediaId);
  const item = await db.transaction(async (tx) => {
    const [content] = await tx.select({ id: media.id, name: media.name, type: media.type, duration: media.duration }).from(media).where(eq(media.id, mediaId)).for("key share");
    if (!content) throw new Error("Conteúdo não encontrado.");
    const [parent] = await tx.select({ id: playlist.id }).from(playlist).where(eq(playlist.id, playlistId)).for("update");
    if (!parent) throw new Error("Playlist não encontrada.");
    const [last] = await tx.select({ last: sql<number>`coalesce(max(${playlistItem.order}), -1)` }).from(playlistItem).where(eq(playlistItem.playlistId, playlistId));
    const [created] = await tx.insert(playlistItem).values({ playlistId, mediaId, order: Number(last.last) + 1 }).returning({ id: playlistItem.id });
    await tx.update(playlist).set({ version: sql`${playlist.version} + 1`, updatedAt: new Date() }).where(eq(playlist.id, playlistId));
    return { id: created.id, media: content };
  });
  refreshPlaylists();
  return item;
}

export async function removeItemFromPlaylist(itemId: string, playlistId: string) {
  await requireSession();
  idSchema.parse(itemId); idSchema.parse(playlistId);
  await db.transaction(async (tx) => {
    await tx.select({ id: playlist.id }).from(playlist).where(eq(playlist.id, playlistId)).for("update");
    const removed = await tx.delete(playlistItem).where(and(eq(playlistItem.id, itemId), eq(playlistItem.playlistId, playlistId))).returning({ id: playlistItem.id });
    if (removed.length) await tx.update(playlist).set({ version: sql`${playlist.version} + 1`, updatedAt: new Date() }).where(eq(playlist.id, playlistId));
  });
  refreshPlaylists();
}

export async function reorderPlaylistItems(playlistId: string, orderedItemIds: string[]) {
  await requireSession();
  idSchema.parse(playlistId); z.array(idSchema).max(10000).parse(orderedItemIds);
  await db.transaction(async (tx) => {
    const [parent] = await tx.select({ id: playlist.id }).from(playlist).where(eq(playlist.id, playlistId)).for("update");
    if (!parent) throw new Error("Playlist não encontrada.");
    const existing = await tx.select({ id: playlistItem.id }).from(playlistItem).where(eq(playlistItem.playlistId, playlistId));
    if (!isExactItemOrder(existing.map((item) => item.id), orderedItemIds)) throw new Error("A playlist mudou. Atualize a página antes de reordenar.");
    for (const [order, id] of orderedItemIds.entries()) {
      await tx.update(playlistItem).set({ order }).where(and(eq(playlistItem.id, id), eq(playlistItem.playlistId, playlistId)));
    }
    await tx.update(playlist).set({ version: sql`${playlist.version} + 1`, updatedAt: new Date() }).where(eq(playlist.id, playlistId));
  });
  refreshPlaylists();
}

export async function getPlaylistWithItems(playlistId: string) {
  await requireSession();
  if (!idSchema.safeParse(playlistId).success) return undefined;
  return readPlaylistWithItems(playlistId);
}

export async function listPlaylists() {
  await requireSession();
  return db.query.playlist.findMany({ with: { items: { columns: { id: true } } }, orderBy: (p, { desc }) => [desc(p.createdAt)] });
}
