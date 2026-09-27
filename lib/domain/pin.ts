import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// PIN hashing lives here (node:crypto only) so both Next routes and CLI scripts can
// use it without pulling in `next/server`. Parameters follow the MYLAUNCHER baseline
// documented in PLAN/FULL-PRD.md §4.
export const PIN_PATTERN = /^\d{4,8}$/;

const SCRYPT_OPTIONS = { N: 16384, r: 8, p: 1, maxmem: 32 * 1024 * 1024 } as const;

export function isValidPin(value: unknown): value is string {
  return typeof value === "string" && PIN_PATTERN.test(value);
}

export function hashPin(pin: string): string {
  if (!isValidPin(pin)) throw new Error("PIN harus 4-8 digit");
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(pin, salt, 32, SCRYPT_OPTIONS);
  return `${salt}$${key.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (typeof pin !== "string" || !pin || typeof stored !== "string") return false;
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const key = scryptSync(pin, salt, 32, SCRYPT_OPTIONS);
  const storedHash = Buffer.from(hash, "hex");
  return storedHash.length === key.length && timingSafeEqual(key, storedHash);
}
