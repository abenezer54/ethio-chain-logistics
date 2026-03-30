/**
 * Safe internal path for post-login redirect (prevents open redirects).
 * Allows paths like /dashboard or /admin?tab=1. Rejects external URLs and auth loops.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (raw == null || raw === "") return null;
  const trimmed = raw.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//")) return null;
  try {
    const u = new URL(trimmed, "http://localhost");
    const path = u.pathname;
    if (path.startsWith("/login") || path.startsWith("/signup")) {
      return null;
    }
    return u.pathname + u.search + u.hash;
  } catch {
    return null;
  }
}

/** Default app home after sign-in when no `next` is provided. */
export function defaultPathForRole(role: string): string {
  if (role === "ADMIN") return "/admin";
  return "/dashboard";
}

export function resolvePostLoginRedirect(
  role: string,
  nextRaw: string | null | undefined
): string {
  const next = safeNextPath(nextRaw);
  if (next) {
    if (role === "ADMIN" && next.startsWith("/dashboard")) {
      return "/admin";
    }
    return next;
  }
  return defaultPathForRole(role);
}

export type LoginResponse = {
  token: string;
  user: {
    id: string;
    email: string;
    role: string;
    status: string;
  };
};
