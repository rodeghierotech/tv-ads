import { db } from "@/db";
import { playlist } from "@/db/schema";
import { eq } from "drizzle-orm";

// Internal query: no Server Action export. The player resolves the TV's playlist first.
export async function readPlaylistWithItems(playlistId: string) {
  return db.query.playlist.findFirst({
    where: eq(playlist.id, playlistId),
    with: { items: { with: { media: true }, orderBy: (i, { asc }) => [asc(i.order), asc(i.id)] } },
  });
}
