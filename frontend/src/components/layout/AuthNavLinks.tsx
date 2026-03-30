"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LayoutDashboard } from "lucide-react";
import { getStoredToken } from "@/lib/auth-storage";
import { decodeJwtPayload, isTokenExpired } from "@/lib/jwt";

type Tone = "darkNav" | "lightNav";

const toneClass: Record<Tone, string> = {
  darkNav:
    "text-white/95 hover:bg-white/10",
  lightNav:
    "text-ec-text-secondary hover:bg-ec-surface hover:text-ec-text",
};

/** Compact “open portal” link when a valid session exists (client-only). */
export function AuthNavLinks({
  className = "",
  tone = "darkNav",
}: {
  className?: string;
  tone?: Tone;
}) {
  const [href, setHref] = useState<string | null>(null);

  useEffect(() => {
    const t = getStoredToken();
    if (!t || isTokenExpired(t)) return;
    const role = decodeJwtPayload(t)?.role;
    if (role === "ADMIN") setHref("/admin");
    else if (role) setHref("/dashboard");
  }, []);

  if (!href) return null;

  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent ${toneClass[tone]} ${className}`}
    >
      <LayoutDashboard size={17} aria-hidden />
      Open portal
    </Link>
  );
}
