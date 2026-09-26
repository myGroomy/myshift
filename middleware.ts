import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken } from "@/lib/session";

const COOKIE_NAME = "myshift_session";
const PUBLIC_API_PATHS = ["/api/auth/login", "/api/auth/logout"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");
  const isPublicApi = PUBLIC_API_PATHS.some((p) => pathname.startsWith(p));

  if (isApi && !isPublicApi) {
    const cookie = request.cookies.get(COOKIE_NAME)?.value;
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
  }

  if (!isApi) {
    const isLoginPage = pathname === "/login";
    const cookie = request.cookies.get(COOKIE_NAME)?.value;
    const session = cookie ? await verifySessionToken(cookie) : null;

    if (isLoginPage && session) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!isLoginPage && !session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
