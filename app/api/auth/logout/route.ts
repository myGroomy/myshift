import { ok } from "@/lib/api-response";
import { sessionCookieHeader } from "@/lib/session";

export async function POST() {
  // Max-Age=0 clears the cookie; tokens are stateless, so role/active changes are caught on
  // the next request by the registry re-check in lib/auth.ts.
  return ok({ success: true }, { headers: sessionCookieHeader("", 0) });
}
