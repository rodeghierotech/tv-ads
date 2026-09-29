import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export function newDeviceToken() {
  return randomBytes(32).toString("base64url");
}

export function hashDeviceToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function deviceTokenMatches(token: string | null, storedHash: string | null) {
  if (!token || !storedHash || !/^[A-Za-z0-9_-]{43}$/.test(token) || !/^[a-f0-9]{64}$/.test(storedHash)) return false;
  return timingSafeEqual(Buffer.from(hashDeviceToken(token), "hex"), Buffer.from(storedHash, "hex"));
}

export function playerAuthorized(headers: Headers, storedHash: string | null) {
  const authorization = headers.get("authorization");
  // Never downgrade a bad token, or a migrated/revoked device, to UUID-only access.
  if (authorization) return deviceTokenMatches(authorization.startsWith("Bearer ") ? authorization.slice(7) : null, storedHash);
  return storedHash === null && process.env.PLAYER_ALLOW_LEGACY_AUTH !== "false";
}
