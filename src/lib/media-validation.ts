export const MAX_MEDIA_BYTES = 3 * 1024 * 1024;
export function mediaKind(mime: string) {
  if (["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(mime)) return "image";
  if (["video/mp4", "video/webm"].includes(mime)) return "video";
  return null;
}
