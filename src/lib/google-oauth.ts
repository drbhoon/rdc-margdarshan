import crypto from "node:crypto";
import { OAuth2Client } from "google-auth-library";
import { appOrigin } from "./auth-policy";
export const OAUTH_COOKIE =
  process.env.NODE_ENV === "production"
    ? "__Host-margdarshan-oauth"
    : "margdarshan-oauth";
export const randomToken = () => crypto.randomBytes(32).toString("base64url");
export function oauthClient() {
  const id = process.env.GOOGLE_CLIENT_ID,
    secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Google sign-in is not configured");
  return new OAuth2Client(
    id,
    secret,
    appOrigin() + "/api/auth/google/callback",
  );
}
function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32)
    throw new Error("SESSION_SECRET must contain at least 32 characters");
  return crypto.createHash("sha256").update(secret).digest();
}
export function sealState(value: {
  state: string;
  nonce: string;
  verifier: string;
  expires: number;
}) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([
    cipher.update(JSON.stringify(value), "utf8"),
    cipher.final(),
  ]);
  return Buffer.concat([iv, cipher.getAuthTag(), data]).toString("base64url");
}
export function openState(value: string) {
  const bytes = Buffer.from(value, "base64url");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    key(),
    bytes.subarray(0, 12),
  );
  decipher.setAuthTag(bytes.subarray(12, 28));
  const result = JSON.parse(
    Buffer.concat([
      decipher.update(bytes.subarray(28)),
      decipher.final(),
    ]).toString("utf8"),
  ) as { state: string; nonce: string; verifier: string; expires: number };
  if (result.expires < Date.now()) throw new Error("Expired sign-in");
  return result;
}
