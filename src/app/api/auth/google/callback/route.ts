import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { prisma } from "@/lib/db";
import {
  OAUTH_COOKIE,
  oauthClient,
  openState,
  randomToken,
} from "@/lib/google-oauth";
import {
  appOrigin,
  corporateEmail,
  effectiveRole,
  isAdminEmail,
  validGoogleIdentity,
} from "@/lib/auth-policy";
import { SESSION_COOKIE, SESSION_SECONDS, tokenHash } from "@/lib/auth";
export async function GET(req: NextRequest) {
  const origin = appOrigin();
  let response: NextResponse;
  try {
    const saved = openState(req.cookies.get(OAUTH_COOKIE)?.value || "");
    const state = req.nextUrl.searchParams.get("state") || "";
    if (
      state.length !== saved.state.length ||
      !crypto.timingSafeEqual(Buffer.from(state), Buffer.from(saved.state))
    )
      throw new Error("Invalid state");
    const code = req.nextUrl.searchParams.get("code");
    if (!code || req.nextUrl.searchParams.has("error"))
      throw new Error("Sign-in cancelled");
    const client = oauthClient();
    const { tokens } = await client.getToken({
      code,
      codeVerifier: saved.verifier,
    });
    if (!tokens.id_token) throw new Error("Missing identity");
    const ticket = await client.verifyIdToken({
      idToken: tokens.id_token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();
    if (
      !payload ||
      !validGoogleIdentity(
        payload as typeof payload & { nonce?: string },
        saved.nonce,
      )
    )
      throw new Error("RDC account required");
    const email = corporateEmail(payload.email)!;
    const rawToken = randomToken();
    const employee = await prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${email}))::text`;
      const bySubject = await tx.employee.findUnique({
        where: { googleSubject: payload.sub },
      });
      const matches = await tx.employee.findMany({
        where: { email: { equals: email, mode: "insensitive" } },
        take: 2,
      });
      if (
        matches.length > 1 ||
        (bySubject &&
          matches[0] &&
          bySubject.employeeCode !== matches[0].employeeCode)
      )
        throw new Error("Ambiguous identity");
      let user = bySubject || matches[0];
      if (
        user &&
        (!user.isActive ||
          (user.googleSubject &&
            !user.googleSubject.startsWith("temp-") &&
            user.googleSubject !== payload.sub))
      )
        throw new Error("Account unavailable");
      if (user)
        user = await tx.employee.update({
          where: { employeeCode: user.employeeCode },
          data: {
            googleSubject: payload.sub,
            email,
            role: effectiveRole({ ...user, email }),
          },
        });
      else
        user = await tx.employee.create({
          data: {
            employeeCode: "GOOGLE-" + payload.sub,
            googleSubject: payload.sub,
            email,
            name: payload.name || email.split("@")[0],
            role: isAdminEmail(email) ? "ADMIN" : "MENTEE",
            department: "To be completed",
            designation: "Graduate Engineer Trainee",
            joinDate: new Date(),
            topics: [],
            challenges: [],
          },
        });
      await tx.authSession.create({
        data: {
          tokenHash: tokenHash(rawToken),
          employeeCode: user.employeeCode,
          expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000),
        },
      });
      return user;
    });
    response = NextResponse.redirect(
      origin +
        (employee.discStyle || isAdminEmail(email)
          ? "/dashboard"
          : "/onboarding"),
    );
    response.cookies.set(SESSION_COOKIE, rawToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: SESSION_SECONDS,
    });
    response.cookies.delete("token");
  } catch (err: unknown) {
    console.error("[Google Sign-In Callback Error]:", err instanceof Error ? err.message : err);
    response = NextResponse.redirect(origin + "/login?error=google_signin");
  }
  response.cookies.delete(OAUTH_COOKIE);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
