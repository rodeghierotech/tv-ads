"use server";

import { db } from "@/db";
import { media } from "@/db/schema";
import { eq } from "drizzle-orm";
import { deleteMediaFile, uploadMediaFile } from "@/lib/media-storage";
import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";

const IMAGE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
const VIDEO_TYPES = ["video/mp4", "video/webm"];

export async function uploadMedia(formData: FormData) {
  const file = formData.get("file") as File;
  const name = (formData.get("name") as string) || file.name;
  const duration = formData.get("duration") ? Number(formData.get("duration")) : null;

  if (!file) throw new Error("Arquivo obrigatório");

  const type = IMAGE_TYPES.includes(file.type)
    ? "image"
    : VIDEO_TYPES.includes(file.type)
    ? "video"
    : null;
  if (!type) throw new Error("Formato de arquivo não suportado");

  const ext = file.name.split(".").pop() ?? "bin";
  const path = `${type}s/${randomUUID()}.${ext}`;
  const url = await uploadMediaFile(file, path);

  const [created] = await db
    .insert(media)
    .values({
      name,
      type,
      url,
      duration: type === "image" ? duration ?? 10 : null,
    })
    .returning();

  revalidatePath("/conteudos");
  return created;
}

export async function deleteMedia(id: string, storagePath: string) {
  if (storagePath) {
    await deleteMediaFile(storagePath);
  }

  await db.delete(media).where(eq(media.id, id));
  revalidatePath("/conteudos");
}

export async function listMedia() {
  return db.query.media.findMany({ orderBy: (m, { desc }) => [desc(m.createdAt)] });
}
