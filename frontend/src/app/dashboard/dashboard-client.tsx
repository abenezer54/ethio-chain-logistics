"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { LogOut, LayoutDashboard } from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { PortalHeader } from "@/components/layout/PortalHeader";
import { clearStoredToken, getStoredToken } from "@/lib/auth-storage";
import { decodeJwtPayload, isTokenExpired } from "@/lib/jwt";

function roleTitle(role: string): string {
  switch (role) {
    case "IMPORTER":
      return "Importer";
    case "SELLER":
      return "Seller";
    case "TRANSPORTER":
      return "Transporter";
    case "CUSTOMS":
      return "Customs";
    case "ESL_AGENT":
      return "ESL agent";
    default:
      return role;
  }
}

function workspacePanel(role: string): {
  title: string;
  body: string;
  hint: string;
} {
  switch (role) {
    case "IMPORTER":
      return {
        title: "Your importing workspace",
        body:
          "This is where your buying workflows will live. You can manage your account today. Full tools for tracking shipments and paperwork are rolling out next.",
        hint:
          "Next step when features go live: create or track a shipment and upload documents in one thread.",
      };
    case "SELLER":
      return {
        title: "Your selling workspace",
        body:
          "This is where your export workflows will live. You can manage your account today. Listing loads and sharing handoffs with buyers is coming soon.",
        hint:
          "Next step when features go live: attach documents to a sale and keep buyers in the same thread.",
      };
    default:
      return {
        title: "Your portal home",
        body:
          "You are signed in for a partner role. Carriers, customs, and ESL staff use this lane to support importers and sellers. More tools for your role will appear here.",
        hint:
          "Next step: check with your Ethio-Chain admin if you need a task that is not here yet.",
      };
  }
}

export default function DashboardClient() {
  const router = useRouter();
  const [phase, setPhase] = useState<"check" | "ready">("check");
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const t = getStoredToken();
    if (!t || isTokenExpired(t)) {
      clearStoredToken();
      router.replace(
        `/login?next=${encodeURIComponent("/dashboard")}`
      );
      return;
    }
    const p = decodeJwtPayload(t);
    if (!p?.role) {
      clearStoredToken();
      router.replace("/login");
      return;
    }
    if (p.role === "ADMIN") {
      router.replace("/admin");
      return;
    }
    setRole(p.role);
    setPhase("ready");
  }, [router]);

  function signOut() {
    clearStoredToken();
    router.push("/");
  }

  const panel = role ? workspacePanel(role) : null;

  if (phase === "check") {
    return (
      <div className="flex min-h-screen flex-col bg-ec-surface">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 px-4">
          <Spinner size="lg" label="Loading workspace" />
          <p className="text-sm text-ec-text-muted">Loading your workspace…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-ec-surface">
      <PortalHeader
        title={panel?.title ?? "Dashboard"}
        subtitle={role ? `Signed in as ${roleTitle(role)}` : undefined}
        actions={
          <>
            <Link
              href="/role-selection"
              className="hidden rounded-lg px-3 py-2 text-sm font-medium text-ec-text-secondary hover:bg-ec-surface hover:text-ec-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent sm:inline"
            >
              Roles
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border border-ec-border bg-ec-card px-3 py-2 text-sm font-semibold text-ec-text shadow-sm transition-colors hover:bg-ec-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
            >
              <LogOut size={18} aria-hidden />
              Sign out
            </button>
          </>
        }
      />

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 md:px-8">
        <div className="ec-card border-ec-border shadow-md">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ec-navy/10 text-ec-navy">
              <LayoutDashboard size={26} aria-hidden />
            </span>
            <div>
              <h2 className="text-lg font-bold text-ec-text">
                What this page is for
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-ec-text-secondary">
                {panel?.body}
              </p>
              <p className="mt-4 text-sm text-ec-text-muted">{panel?.hint}</p>
            </div>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link href="/" className="ec-btn-primary justify-center px-6">
              Visit public site
            </Link>
            <Link
              href="/role-selection"
              className="ec-btn-ghost justify-center border border-ec-border bg-ec-card px-6"
            >
              See all roles
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
