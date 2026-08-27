import { randomBytes } from "crypto";

// Ex: A7K9-21QF — 8 chars alfanuméricos, sem 0/O/1/I para evitar confusão
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function generatePairingCode(): string {
  const bytes = randomBytes(8);
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
    if (i === 3) code += "-";
  }
  return code;
}

export const HEARTBEAT_TIMEOUT_MS = 90_000; // 3x o intervalo de heartbeat (30s)
