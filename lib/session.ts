import { headers as getHeaders } from "next/headers";

const COOKIE_NAME = "myshift_session";

export type SessionPayload = {
  employeeId: string;
  nama: string;
  role: "admin" | "kepala_cabang" | "karyawan";
  branches: { branchId: string; nama: string }[];
  activeBranchId: string;
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
  const secret = process.env.MYSHIFT_API_KEY;
  if (!secret || secret.length < 32) throw new Error("MYSHIFT_API_KEY must be configured");
  return crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    [usage],
  );
}

export async function createSessionToken(payload: SessionPayload) {
  const body = base64UrlEncode(JSON.stringify({ ...payload, exp: Math.floor(Date.now() / 1000) + 604800 }));
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
    const payload = JSON.parse(new TextDecoder().decode(base64UrlDecode(body))) as SessionPayload;
    return payload.exp && payload.exp >= Math.floor(Date.now() / 1000) ? payload : null;
  } catch {
    return null;
  }
}

export { COOKIE_NAME };

export function sessionCookieHeader(value: string, maxAge = 604800) {
  return {
    "Set-Cookie": `${COOKIE_NAME}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`,
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
