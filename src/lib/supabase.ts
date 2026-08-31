import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export const supabaseAdmin =
  supabaseUrl && supabaseServiceRoleKey ? createClient(supabaseUrl, supabaseServiceRoleKey) : null;

export const MEDIA_BUCKET = "media";

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return `data:${file.type || "application/octet-stream"};base64,${Buffer.from(binary, "binary").toString("base64")}`;
}

export async function uploadMediaFile(file: File, path: string) {
  if (!supabaseAdmin) {
    return fileToDataUrl(file);
  }

  const { error } = await supabaseAdmin.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { upsert: false });

  if (error) throw error;

  const { data } = supabaseAdmin.storage.from(MEDIA_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

export async function deleteMediaFile(path: string) {
  if (!supabaseAdmin) return;
  await supabaseAdmin.storage.from(MEDIA_BUCKET).remove([path]);
}

// Extrai o path dentro do bucket a partir da URL pública do Supabase Storage.
// Quando o storage não estiver configurado, aceita URLs gerais e retorna um path seguro.
export function extractStoragePath(publicUrl: string): string {
  if (!publicUrl) return "";

  const marker = `/object/public/${MEDIA_BUCKET}/`;
  const idx = publicUrl.indexOf(marker);
  if (idx !== -1) return publicUrl.slice(idx + marker.length);

  try {
    const url = new URL(publicUrl);
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (pathname) return pathname;
  } catch {
    // ignora e usa fallback abaixo
  }

  const lastSegment = publicUrl.split("/").filter(Boolean).pop();
  return lastSegment ?? publicUrl;
}
