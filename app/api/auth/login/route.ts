import { NextResponse } from "next/server";
import { verifyAdminPassword } from "@/lib/admin-auth";
import { createSessionToken, SESSION_COOKIE, SESSION_DURATION_SECONDS } from "@/lib/auth-session";
import { checkLoginRateLimit, clearFailedLogins, recordFailedLogin } from "@/lib/login-rate-limit";

export async function POST(request: Request) {
  const rateLimit = checkLoginRateLimit(request);
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "too_many_attempts", message: "Too many sign-in attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(rateLimit.retryAfter), "Access-Control-Allow-Origin": "*" } },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    password?: unknown;
    client?: unknown;
  } | null;
  const auth = verifyAdminPassword(body?.password);
  if (!auth.ok) {
    recordFailedLogin(rateLimit.key);
    return NextResponse.json(
      { error: "login_failed", message: auth.message },
      { status: auth.status, headers: { "Access-Control-Allow-Origin": "*" } },
    );
  }

  clearFailedLogins(rateLimit.key);
  const password = body?.password as string;
  const token = createSessionToken(password);
  const response = NextResponse.json({
    ok: true,
    ...(body?.client === "extension" ? { token } : {}),
  });
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
  return response;
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
