import { createHmac, timingSafeEqual } from "crypto";

export const SESSION_COOKIE = "brasserie-session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 30;

function signature(expiresAt: string, password: string) {
  return createHmac("sha256", password)
    .update(`brasserie-session:${expiresAt}`)
    .digest("base64url");
}

export function createSessionToken(password: string) {
  const expiresAt = String(Math.floor(Date.now() / 1000) + SESSION_DURATION_SECONDS);
  return `${expiresAt}.${signature(expiresAt, password)}`;
}

export function verifySessionToken(token: string | undefined) {
  const password = process.env.RECIPE_ADMIN_PASSWORD;
  if (!password || !token) return false;

  const [expiresAt, suppliedSignature, ...rest] = token.split(".");
  if (!expiresAt || !suppliedSignature || rest.length) return false;

  const expiry = Number(expiresAt);
  if (!Number.isInteger(expiry) || expiry <= Math.floor(Date.now() / 1000)) return false;

  const expectedSignature = signature(expiresAt, password);
  const supplied = Buffer.from(suppliedSignature);
  const expected = Buffer.from(expectedSignature);
  return supplied.length === expected.length && timingSafeEqual(supplied, expected);
}
