// PIN validation only — stored as plaintext per user request (2026-10-01).
// WARNING: This violates AGENTS.md §5 ("Jangan simpan PIN plaintext di Sheets").
// Plaintext PINs are readable by anyone with spreadsheet access.
export const PIN_PATTERN = /^\d{4,8}$/;

export function isValidPin(value: unknown): value is string {
  return typeof value === "string" && PIN_PATTERN.test(value);
}

export function hashPin(pin: string): string {
  if (!isValidPin(pin)) throw new Error("PIN harus 4-8 digit");
  return pin;
}

export function verifyPin(pin: string, stored: string): boolean {
  if (typeof pin !== "string" || !pin || typeof stored !== "string") return false;
  return pin === stored;
}
