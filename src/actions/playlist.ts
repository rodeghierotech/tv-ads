"use server";

import { db } from "@/db";
import { playlist, playlistItem } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function createPlaylist(name: string) {
  const [created] = await db.insert(playlist).values({ name }).returning();
  revalidatePath("/playlists");
  return created;
}

export async function renamePlaylist(id: string, name: string) {
  await db
    .update(playlist)
    .set({ name, updatedAt: new Date() })
    .where(eq(playlist.id, id));
  revalidatePath("/playlists");
}

export async function deletePlaylist(id: string) {
  await db.delete(playlist).where(eq(playlist.id, id));
  revalidatePath("/playlists");
}

export async function addItemToPlaylist(playlistId: string, mediaId: string) {
  const items = await db.query.playlistItem.findMany({ where: eq(playlistItem.playlistId, playlistId) });
  await db.insert(playlistItem).values({ playlistId, mediaId, order: items.length });
  await bumpVersion(playlistId);
  revalidatePath("/playlists");
}

export async function removeItemFromPlaylist(itemId: string, playlistId: string) {
  await db.delete(playlistItem).where(eq(playlistItem.id, itemId));
  await bumpVersion(playlistId);
  revalidatePath("/playlists");
}

// Recebe a lista de IDs de playlistItem na nova ordem
export async function reorderPlaylistItems(playlistId: string, orderedItemIds: string[]) {
  await Promise.all(
    orderedItemIds.map((id, index) =>
      db.update(playlistItem).set({ order: index }).where(eq(playlistItem.id, id)),
    ),
  );
  await bumpVersion(playlistId);
  revalidatePath("/playlists");
}

async function bumpVersion(playlistId: string) {
  await db
    .update(playlist)
    .set({ version: sql`${playlist.version} + 1`, updatedAt: new Date() })
    .where(eq(playlist.id, playlistId));
}

export async function getPlaylistWithItems(playlistId: string) {
  return db.query.playlist.findFirst({
    where: eq(playlist.id, playlistId),
    with: {
      items: {
        with: { media: true },
        orderBy: (i, { asc }) => [asc(i.order)],
      },
    },
  });
}

export async function listPlaylists() {
  return db.query.playlist.findMany({
    with: { items: true },
    orderBy: (p, { desc }) => [desc(p.createdAt)],
  });
}
