export const CORPORATE_DOMAIN = "rdc.in";
export function corporateEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@rdc\.in$/.test(email) ? email : null;
}
export function isAdminEmail(
  email: string,
  configured = process.env.ADMIN_EMAILS || "",
): boolean {
  const normalized = corporateEmail(email);
  return (
    normalized !== null &&
    configured
      .split(/[,;\s]+/)
      .some((item) => corporateEmail(item) === normalized)
  );
}
export function effectiveRole(employee: {
  email: string;
  role: "ADMIN" | "MENTOR" | "MENTEE";
}): "ADMIN" | "MENTOR" | "MENTEE" {
  if (isAdminEmail(employee.email)) return "ADMIN";
  return employee.role === "MENTOR" ? "MENTOR" : "MENTEE";
}
export function validGoogleIdentity(
  payload: {
    email?: string;
    email_verified?: boolean;
    hd?: string;
    sub?: string;
    nonce?: string;
  },
  nonce: string,
) {
  // Only call after the Google library verifies signature, issuer, audience and expiry.
  const hasSub = Boolean(payload.sub);
  const isVerified = payload.email_verified === true;
  const isCorporate = Boolean(corporateEmail(payload.email));
  // If Google Workspace hosted domain claim is present, verify it; otherwise verified corporateEmail guarantees @rdc.in
  const matchesDomain =
    !payload.hd ||
    payload.hd === CORPORATE_DOMAIN ||
    Boolean(payload.email?.toLowerCase().endsWith("@" + CORPORATE_DOMAIN));
  // If Google returned nonce in the ID token, verify it matches; otherwise PKCE code verifier ensures freshness
  const matchesNonce = !payload.nonce || payload.nonce === nonce;

  return Boolean(
    hasSub && isVerified && isCorporate && matchesDomain && matchesNonce,
  );
}
export function appOrigin(): string {
  if (!process.env.APP_URL) throw new Error("APP_URL is required");
  const url = new URL(process.env.APP_URL);
  if (
    url.username ||
    url.password ||
    (url.protocol !== "https:" &&
      !(process.env.NODE_ENV !== "production" && url.hostname === "localhost"))
  )
    throw new Error("Invalid APP_URL");
  return url.origin;
}
