import { cookies } from "next/headers";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import { corporateEmail, effectiveRole } from "./auth-policy";
export const SESSION_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-margdarshan-session"
    : "margdarshan-session";
export const SESSION_SECONDS = 60 * 60 * 24 * 7;
export interface UserSession {
  employeeCode: string;
  email: string;
  role: "MENTEE" | "MENTOR" | "ADMIN";
  name: string;
}
export const tokenHash = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");
export async function getSession(): Promise<UserSession | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !/^[A-Za-z0-9_-]{43}$/.test(token)) return null;
  const stored = await prisma.authSession.findUnique({
    where: { tokenHash: tokenHash(token) },
    include: { employee: true },
  });
  if (
    !stored ||
    stored.expiresAt <= new Date() ||
    !stored.employee.isActive ||
    !stored.employee.googleSubject ||
    !corporateEmail(stored.employee.email)
  )
    return null;
  const employee = stored.employee;
  return {
    employeeCode: employee.employeeCode,
    email: employee.email,
    name: employee.name,
    role: effectiveRole(employee),
  };
}
export async function isAuthorizedAdmin(
  session: UserSession | null,
): Promise<boolean> {
  return session?.role === "ADMIN";
}
export async function revokeSession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token)
    await prisma.authSession.deleteMany({
      where: { tokenHash: tokenHash(token) },
    });
  jar.delete(SESSION_COOKIE);
  jar.delete("token");
}
