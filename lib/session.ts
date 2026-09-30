import { headers as getHeaders } from "next/headers";
import { getEnv } from "@/lib/env";
import { normalizeEmployeeRole, type EmployeeRole } from "@/lib/domain/employee-role";

const COOKIE_NAME = "myshift_session";

// Long enough to cover a shift, short enough to limit a stolen cookie's value.
// Role/active changes are enforced per request in lib/auth.ts, not by this TTL alone.
export const SESSION_TTL_SECONDS = 12 * 60 * 60;

export type SessionPayload = {
  employeeId: string;
  nama: string;
  role: EmployeeRole;
  branches: { branchId: string; nama: string }[];
  activeBranchId: string;
  iat?: number;
  exp?: number;
};

function base64UrlEncode(value: Uint8Array | string) {
  const bytes = typeof value === "string" ? new TextEncoder().encode(value) : value;
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function base64UrlDecode(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (value.length % 4)) % 4);
  const binary = atob(padded);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function hmacKey(usage: "sign" | "verify") {
  const secret = getEnv().MYSHIFT_API_KEY;
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

// iat/exp are always rewritten from the server clock callers can pass a previous payload
// (e.g. select-branch) without being able to extend their own session.
export async function createSessionToken(payload: SessionPayload) {
  const issuedAt = Math.floor(Date.now() / 1000);
  const body = base64UrlEncode(
    JSON.stringify({ ...payload, iat: issuedAt, exp: issuedAt + SESSION_TTL_SECONDS }),
  );
  const signature = await crypto.subtle.sign("HMAC", await hmacKey("sign"), new TextEncoder().encode(body));
  return `${body}.${base64UrlEncode(new Uint8Array(signature))}`;
}

export async function verifySessionToken(cookieValue?: string): Promise<SessionPayload | null> {
  if (!cookieValue) return null;
  const [body, signature] = cookieValue.split(".");
  if (!body || !signature) return null;

  const valid = await crypto.subtle.verify(
    "HMAC",
    await hmacKey("verify"),
    base64UrlDecode(signature),
    new TextEncoder().encode(body),
  );
  if (!valid) return null;

  try {
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as SessionPayload & { role: string };
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return { ...payload, role: normalizeEmployeeRole(payload.role) };
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

// `Secure` in production only, so local http://localhost dev keeps working. Without it the
// session cookie could be sent over a plaintext connection despite HSTS being enabled.
export function sessionCookieHeader(value: string, maxAge = SESSION_TTL_SECONDS) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return {
    "Set-Cookie": `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`,
  };
}

export async function getServerSession(): Promise<SessionPayload | null> {
  try {
    const cookie = (await getHeaders()).get("cookie") ?? "";
    const match = cookie.match(new RegExp(`${COOKIE_NAME}=([^;]+)`));
    if (!match) return null;
    return await verifySessionToken(match[1]);
  } catch {
    return null;
  }
}
