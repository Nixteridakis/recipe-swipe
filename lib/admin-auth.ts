import { timingSafeEqual } from "crypto";

export type AdminAuthResult =
  | { ok: true }
  | { ok: false; status: 401 | 503; message: string };

export function verifyAdminPassword(password: unknown): AdminAuthResult {
  const configuredPassword = process.env.RECIPE_ADMIN_PASSWORD;
  if (!configuredPassword) {
    return {
      ok: false,
      status: 503,
      message: "Recipe administration is not configured on this server.",
    };
  }

  if (typeof password !== "string") {
    return { ok: false, status: 401, message: "Enter the admin password." };
  }

  const supplied = Buffer.from(password);
  const expected = Buffer.from(configuredPassword);
  if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) {
    return { ok: false, status: 401, message: "The admin password is incorrect." };
  }

  return { ok: true };
}
