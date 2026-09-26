import { ok } from "@/lib/api-response";
import { COOKIE_NAME } from "@/lib/session";

export async function POST() {
  const headers: HeadersInit = {
    "Set-Cookie": `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  };
  return ok({ success: true }, { headers });
}
