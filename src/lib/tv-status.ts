import { HEARTBEAT_TIMEOUT_MS } from "@/lib/pairing";

export function computeTvStatus(lastHeartbeat: Date | null): "online" | "offline" {
  if (!lastHeartbeat) return "offline";
  return Date.now() - lastHeartbeat.getTime() < HEARTBEAT_TIMEOUT_MS ? "online" : "offline";
}
