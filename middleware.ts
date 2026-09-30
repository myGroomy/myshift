import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { COOKIE_NAME, verifySessionToken } from "@/lib/session";
import { redirectForPage } from "@/lib/nav-guard";

const PUBLIC_API_PATHS = new Set(["/api/auth/login", "/api/auth/logout"]);
const PUBLIC_REPORT_API = /^\/api\/public\/reports\/[^/]+$/;
const PUBLIC_REPORT_PAGE = /^\/laporan-publik\/[^/]+$/;

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const normalized = pathname.length > 1 ? pathname.replace(/\/+$/, "") : pathname;
  const isApi = normalized.startsWith("/api");
  const isPublicApi = PUBLIC_API_PATHS.has(normalized) || PUBLIC_REPORT_API.test(normalized);
  const isPublicPage = normalized === "/laporan-publik" || PUBLIC_REPORT_PAGE.test(normalized);

  const cookie = request.cookies.get(COOKIE_NAME)?.value;
  const session = cookie ? await verifySessionToken(cookie) : null;

  if (isApi && !isPublicApi) {
    if (!session) {
      return new NextResponse(
        JSON.stringify({
          success: false,
          error: { code: "UNAUTHORIZED", message: "Session expired or invalid" },
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }
  }

  if (!isApi) {
    const isLoginPage = normalized === "/login";
    const isLandingPage = normalized === "/";

    // Already logged in trying to access /login -> send to appropriate home
    if (isLoginPage && session) {
      const target = session.role === "admin" ? "/dashboard" : "/jadwal-saya";
      return NextResponse.redirect(new URL(target, request.url));
    }

    // Unauthenticated trying to access protected internal routes
    // (Landing page '/' is PUBLIC, so anyone can see marketing info)
    if (!isLoginPage && !isLandingPage && !isPublicPage && !session) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", normalized);
      return NextResponse.redirect(loginUrl);
    }

    // Guard arah: pantulkan peran ke halaman yang bukan miliknya. Halaman checklist dan
    // handover dapat dipakai kedua role; API tetap mengunci setiap operasi per-endpoint.
    if (session && !isLoginPage && !isLandingPage && !isPublicPage) {
      const target = redirectForPage(normalized, session.role);
      if (target) return NextResponse.redirect(new URL(target, request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
