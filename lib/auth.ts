import { getEmployees } from "@/lib/google/registry";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";
import type { SessionPayload } from "@/lib/session";
import type { NextRequest } from "next/server";

// Simple in-memory cache for session validation results to reduce Google Sheets API calls.
// TTL is short (5 minutes) to balance quota savings with reasonable staleness for role/active changes.
// For multi-instance production deployments, consider a shared cache (e.g., Redis) instead.
const sessionValidationCache = new Map<string, { valid: boolean; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export async function getSession(request: NextRequest): Promise<SessionPayload | null> {
  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = cookie ? await verifySessionToken(cookie) : null;
  if (!session) return null;
  return (await isSessionStillValid(session)) ? session : null;
}

export function hasRole(session: SessionPayload | null, roles: SessionPayload["role"][]) {
  return Boolean(session && roles.includes(session.role));
}

// Sessions are stateless (HMAC + exp), so nothing else would revoke them. Re-checking the
// registry on every request makes role changes and deactivation effective immediately
// instead of "whenever the 12h token happens to expire".
// To avoid exhausting Google Sheets API quota, we cache the validation result per employee
// for a short TTL. The HMAC signature on the cookie still guarantees authenticity.
async function isSessionStillValid(session: SessionPayload): Promise<boolean> {
  const cacheKey = `${session.employeeId}:${session.role}`;
  const cached = sessionValidationCache.get(cacheKey);
  const now = Date.now();

  if (cached && cached.expiresAt > now) {
    return cached.valid;
  }

  try {
    const employee = (await getEmployees()).find((entry) => entry.employeeId === session.employeeId);
    const valid = Boolean(employee && employee.aktif && employee.role === session.role);
    sessionValidationCache.set(cacheKey, { valid, expiresAt: now + CACHE_TTL_MS });
    return valid;
  } catch (error) {
    // Fail open on infrastructure failure: the token is still HMAC-verified and unexpired,
    // and a transient Sheets outage must not sign the whole shop out mid-shift.
    console.error("[myshift] session revalidation skipped:", error);
    return true;
  }
}
