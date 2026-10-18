import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

const COOKIE = "libaas_admin";
const ADMIN_EMAIL = "m.warismahmood@gmail.com";

function signature() {
  const secret = process.env.ADMIN_PASSWORD;
  if (!secret) throw new Error("ADMIN_PASSWORD is not configured.");
  return createHmac("sha256", secret).update(ADMIN_EMAIL).digest("hex");
}

export async function isAdminAuthenticated() {
  const value = (await cookies()).get(COOKIE)?.value ?? "";
  const expected = signature();
  return value.length === expected.length && timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export async function signInAdmin(email: string, password: string) {
  const configuredPassword = process.env.ADMIN_PASSWORD;
  if (!configuredPassword || email.trim().toLowerCase() !== ADMIN_EMAIL || password !== configuredPassword) return false;
  (await cookies()).set(COOKIE, signature(), {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 60 * 60 * 12,
  });
  return true;
}

export async function signOutAdmin() {
  (await cookies()).delete(COOKIE);
}

export { ADMIN_EMAIL };
