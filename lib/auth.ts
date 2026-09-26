import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import type { SessionPayload } from "./session";
import { verifySessionToken } from "./session";

export async function getSession(request: NextRequest) {
  const cookie = request.cookies.get("myshift_session")?.value;
  return cookie ? verifySessionToken(cookie) : null;
}

export function hasRole(session: SessionPayload | null, roles: SessionPayload["role"][]) {
  return Boolean(session && roles.includes(session.role));
}

export function hashPin(pin: string): string {
  const salt = randomBytes(16).toString("hex");
  const key = scryptSync(pin, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  return `${salt}$${key.toString("hex")}`;
}

export function verifyPin(pin: string, stored: string): boolean {
  const [salt, hash] = stored.split("$");
  if (!salt || !hash) return false;
  const key = scryptSync(pin, salt, 32, {
    N: 16384,
    r: 8,
    p: 1,
    maxmem: 32 * 1024 * 1024,
  });
  const storedHash = Buffer.from(hash, "hex");
  return storedHash.length === key.length && timingSafeEqual(key, storedHash);
}

export function withAuth(handler: (req: NextRequest, session: SessionPayload) => Promise<NextResponse>) {
  return async (req: NextRequest) => {
    const cookie = req.cookies.get("myshift_session")?.value;
    const session = cookie ? await verifySessionToken(cookie) : null;
    if (!session) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Session expired or invalid" },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    return handler(req, session);
  };
}
