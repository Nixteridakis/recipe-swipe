import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth-session";

const PUBLIC_PATHS = new Set(["/login", "/api/auth/login", "/api/health"]);

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const bearerToken = request.headers.get("authorization")?.match(/^Bearer (.+)$/i)?.[1];
  const isAuthenticated = verifySessionToken(
    request.cookies.get(SESSION_COOKIE)?.value ?? bearerToken,
  );

  // CORS preflights carry the requested header names, not the bearer token itself.
  if (request.method === "OPTIONS") return NextResponse.next();

  if (pathname === "/login" && isAuthenticated) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (PUBLIC_PATHS.has(pathname)) return NextResponse.next();

  if (!isAuthenticated) {
    if (pathname.startsWith("/api/")) {
      const response = NextResponse.json(
        { error: "authentication_required", message: "Sign in to continue." },
        { status: 401 },
      );
      response.headers.set("Access-Control-Allow-Origin", "*");
      return response;
    }

    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
