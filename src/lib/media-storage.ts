async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "application/octet-stream"};base64,${buffer.toString("base64")}`;
}

export async function uploadMediaFile(file: File, _path: string) {
  return fileToDataUrl(file);
}

export async function deleteMediaFile(_path: string) {
  return;
}

export function extractStoragePath(publicUrl: string): string {
  if (!publicUrl || publicUrl.startsWith("data:")) return "";

  try {
    const url = new URL(publicUrl);
    const pathname = decodeURIComponent(url.pathname.replace(/^\/+/, ""));
    if (pathname) return pathname;
  } catch {
    // Mantem compatibilidade com URLs antigas salvas no banco.
  }

  const lastSegment = publicUrl.split("/").filter(Boolean).pop();
  return lastSegment ?? "";
}
