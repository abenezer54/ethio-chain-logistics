/** Decode JWT payload (browser only). For UI routing, not signature verification. */

export type JwtPayload = {
  sub?: string;
  role?: string;
  exp?: number;
};

export function decodeJwtPayload(token: string): JwtPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const pad = base64.length % 4;
    if (pad) base64 += "=".repeat(4 - pad);
    const json = atob(base64);
    const o = JSON.parse(json) as Record<string, unknown>;
    return {
      sub: typeof o.sub === "string" ? o.sub : undefined,
      role: typeof o.role === "string" ? o.role : undefined,
      exp: typeof o.exp === "number" ? o.exp : undefined,
    };
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string): boolean {
  const p = decodeJwtPayload(token);
  if (p?.exp == null) return false;
  return Date.now() / 1000 >= p.exp;
}
