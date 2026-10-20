export const CORPORATE_DOMAIN = "rdc.in";
export const CORPORATE_DOMAINS = ["rdc.in", "ultrafine.in"] as const;
export function corporateEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  return /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(rdc|ultrafine)\.in$/.test(email)
    ? email
    : null;
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
  googleSubject?: string | null;
}): "ADMIN" | "MENTOR" | "MENTEE" {
  if (isAdminEmail(employee.email)) return "ADMIN";
  // Demo identities are isolated by their synthetic Google subject. This keeps
  // the one-click administrator journey usable without weakening real accounts.
  if (
    process.env.DEMO_MODE !== "false" &&
    employee.googleSubject?.startsWith("demo-sub-")
  ) {
    return employee.role;
  }
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
  // If Google Workspace hosted domain claim is present, verify it matches an allowed corporate domain
  const matchesDomain =
    !payload.hd ||
    (CORPORATE_DOMAINS as readonly string[]).includes(payload.hd) ||
    CORPORATE_DOMAINS.some((domain) =>
      Boolean(payload.email?.toLowerCase().endsWith("@" + domain)),
    );
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
