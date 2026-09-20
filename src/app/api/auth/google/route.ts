import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { CodeChallengeMethod } from "google-auth-library";
import {
  OAUTH_COOKIE,
  oauthClient,
  randomToken,
  sealState,
} from "@/lib/google-oauth";
export async function GET() {
  try {
    const state = randomToken(),
      nonce = randomToken(),
      verifier = randomToken();
    const url = oauthClient().generateAuthUrl({
      scope: ["openid", "email", "profile"],
      state,
      nonce,
      hd: "rdc.in",
      prompt: "select_account",
      code_challenge: crypto
        .createHash("sha256")
        .update(verifier)
        .digest("base64url"),
      code_challenge_method: CodeChallengeMethod.S256,
    });
    const response = NextResponse.redirect(url);
    response.cookies.set(
      OAUTH_COOKIE,
      sealState({ state, nonce, verifier, expires: Date.now() + 600000 }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 600,
      },
    );
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch {
    return NextResponse.json(
      {
        error:
          "Google sign-in is not configured. Please contact the programme administrator.",
      },
      { status: 503 },
    );
  }
}
