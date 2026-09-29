const DEVICE_KEY = "tv-ads-device-id";
export const deviceTokenKey = (id: string) => `${DEVICE_KEY}:token:${id}`;

export function ensureDeviceToken(id: string, storage: Pick<Storage, "getItem" | "setItem"> = localStorage) {
  const key = deviceTokenKey(id);
  const existing = storage.getItem(key);
  if (existing) return existing;
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const token = btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  // Persist BEFORE the server claims a legacy TV, so a lost response is retryable.
  storage.setItem(key, token);
  return token;
}
