// Account lockout policy for POST /api/auth/login (contract §1: response 423 ACCOUNT_LOCKED).
// Pure functions so the policy is unit-testable without Sheets.
export const LOGIN_MAX_ATTEMPTS = 5;
export const LOGIN_LOCK_MINUTES = 15;
export const LOGIN_LOCK_MS = LOGIN_LOCK_MINUTES * 60 * 1000;
// Fixed delay on the failure path, so brute-forcing a 4-digit PIN is not free.
export const LOGIN_FAILURE_DELAY_MS = 300;

export type LockState = { attempts: number; lockedUntil: string };

export function parseAttempts(value: string | undefined): number {
  const parsed = Number((value ?? "").trim());
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : 0;
}

export function isLockActive(lockedUntil: string | undefined, nowMs: number = Date.now()): boolean {
  if (!lockedUntil) return false;
  const until = Date.parse(lockedUntil);
  return Number.isFinite(until) && until > nowMs;
}

// SHEETS-SCHEMA says Failed_Login_Attempts is "reset otomatis setelah lock berakhir".
export function registerLoginFailure(state: LockState, nowMs: number = Date.now()): LockState {
  const lockExpired = Boolean(state.lockedUntil) && !isLockActive(state.lockedUntil, nowMs);
  const attempts = (lockExpired ? 0 : state.attempts) + 1;
  return {
    attempts,
    lockedUntil: attempts >= LOGIN_MAX_ATTEMPTS ? new Date(nowMs + LOGIN_LOCK_MS).toISOString() : "",
  };
}

export function resetLoginFailure(): LockState {
  return { attempts: 0, lockedUntil: "" };
}

export function lockMessage(lockedUntil: string): string {
  return `Akun terkunci karena terlalu banyak percobaan gagal. Coba lagi setelah ${lockedUntil}.`;
}

export async function loginFailureDelay(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, LOGIN_FAILURE_DELAY_MS));
}
