import { createClient } from "@supabase/supabase-js";

export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
);

export const MEDIA_BUCKET = "media";

export async function uploadMediaFile(file: File, path: string) {
  const { error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: false });
  if (error) throw error;
  const { data } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMediaFile(path: string) {
  await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([path]);
}

// Extrai o path dentro do bucket a partir da URL pública do Supabase Storage
export function extractStoragePath(publicUrl: string): string {
  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx === -1) throw new Error("URL de storage inválida");
  return publicUrl.slice(idx + marker.length);
}
