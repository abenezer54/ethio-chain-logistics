"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ShoppingCart,
  Store,
  Anchor,
  Truck,
  ShieldCheck,
  Settings,
  ArrowLeft,
  ChevronRight,
  History,
} from "lucide-react";
import { AuthNavLinks } from "@/components/layout/AuthNavLinks";

const STORAGE_KEY = "ec_last_role";

type RoleId =
  | "IMPORTER"
  | "SELLER"
  | "ESL_AGENT"
  | "TRANSPORTER"
  | "CUSTOMS"
  | "ADMIN";

type RoleCard = {
  id: RoleId;
  title: string;
  hint: string;
  cta: string;
  icon: typeof ShoppingCart;
  href: string;
  tier: "primary" | "secondary";
};

const roles: RoleCard[] = [
  {
    id: "IMPORTER",
    title: "Importer",
    hint:
      "Bring goods through the corridor, track clearance, and keep documents next to each shipment.",
    cta: "Continue as importer",
    icon: ShoppingCart,
    href: "/signup?role=IMPORTER",
    tier: "primary",
  },
  {
    id: "SELLER",
    title: "Seller",
    hint:
      "Move cargo toward buyers, share handoffs, and cut mixed signals on what shipped when.",
    cta: "Continue as seller",
    icon: Store,
    href: "/signup?role=SELLER",
    tier: "primary",
  },
  {
    id: "ESL_AGENT",
    title: "ESL agent",
    hint: "Support port and corridor steps for the customers you serve.",
    cta: "Register as ESL agent",
    icon: Anchor,
    href: "/signup?role=ESL_AGENT",
    tier: "secondary",
  },
  {
    id: "TRANSPORTER",
    title: "Transporter",
    hint: "See assigned loads, routes, and status updates in one thread.",
    cta: "Register as transporter",
    icon: Truck,
    href: "/signup?role=TRANSPORTER",
    tier: "secondary",
  },
  {
    id: "CUSTOMS",
    title: "Customs",
    hint: "Review declarations and supporting papers for your office.",
    cta: "Register as customs user",
    icon: ShieldCheck,
    href: "/signup?role=CUSTOMS",
    tier: "secondary",
  },
  {
    id: "ADMIN",
    title: "Administrator",
    hint: "Approve new accounts and review uploaded ID documents.",
    cta: "Open admin console",
    icon: Settings,
    href: "/admin",
    tier: "secondary",
  },
];

function titleForId(id: string | null): string | null {
  if (!id) return null;
  const r = roles.find((x) => x.id === id);
  return r?.title ?? null;
}

function RoleCardLink({ role }: { role: RoleCard }) {
  const Icon = role.icon;
  const primary =
    role.tier === "primary"
      ? "border-ec-accent/35 bg-ec-card shadow-md ring-1 ring-ec-accent/20"
      : "border-ec-border bg-ec-card shadow-md";

  return (
    <Link
      href={role.href}
      onClick={() => rememberRole(role.id)}
      className={`group flex h-full flex-col rounded-2xl border p-6 transition-all duration-200 hover:-translate-y-0.5 hover:border-ec-accent/50 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 ${primary}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <span
          className={`flex h-12 w-12 items-center justify-center rounded-xl transition-colors duration-200 ${
            role.tier === "primary"
              ? "bg-ec-accent/15 text-ec-accent group-hover:bg-ec-accent group-hover:text-white"
              : "bg-ec-navy/10 text-ec-navy group-hover:bg-ec-accent group-hover:text-white"
          }`}
        >
          <Icon size={24} strokeWidth={2} aria-hidden />
        </span>
        <ChevronRight
          className="mt-1 shrink-0 text-ec-text-muted transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-ec-accent"
          size={20}
          aria-hidden
        />
      </div>
      <h2 className="text-lg font-bold text-ec-text">{role.title}</h2>
      <p className="mt-2 flex-1 text-sm leading-relaxed text-ec-text-secondary">
        {role.hint}
      </p>
      <span className="mt-4 text-sm font-semibold text-ec-accent">{role.cta}</span>
    </Link>
  );
}

function rememberRole(id: RoleId) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    /* ignore quota */
  }
}

export function RoleSelectionContent() {
  const [lastId, setLastId] = useState<string | null>(null);

  useEffect(() => {
    setLastId(localStorage.getItem(STORAGE_KEY));
  }, []);

  const lastTitle = titleForId(lastId);
  const lastHref =
    lastId && lastId !== "ADMIN"
      ? `/signup?role=${encodeURIComponent(lastId)}`
      : lastId === "ADMIN"
        ? "/admin"
        : null;

  const primary = roles.filter((r) => r.tier === "primary");
  const secondary = roles.filter((r) => r.tier === "secondary");

  return (
    <div className="flex min-h-screen flex-col bg-ec-surface">
      <header className="border-b border-ec-border bg-ec-card shadow-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-ec-text-secondary transition-colors hover:text-ec-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 rounded-lg"
          >
            <ArrowLeft size={18} aria-hidden />
            Home
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <AuthNavLinks tone="lightNav" />
            <Link
              href="/login"
              className="text-sm font-semibold text-ec-accent hover:text-ec-accent-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded-md"
            >
              Sign in
            </Link>
            <span className="hidden text-sm font-semibold text-ec-text-muted sm:block">
              Ethio-Chain Logistics
            </span>
          </div>
        </div>
      </header>

      <main className="flex-1 px-4 pb-16 pt-10 md:px-8">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-ec-accent">
            Ethio-Chain Logistics platform
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ec-text md:text-4xl">
            Choose your role on Ethio-Chain
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed text-ec-text-secondary md:text-lg">
            You are registering for an account on the Ethio-Chain logistics
            platform. Pick the role that matches how you work. This is not an
            application to one employer. Each role has its own verification
            steps. After you choose, you will complete registration for that role.
          </p>
        </div>

        {lastTitle && lastHref ? (
          <div className="mx-auto mt-8 max-w-xl rounded-2xl border border-ec-accent/30 bg-ec-card p-4 shadow-md md:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-3 text-left">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ec-accent/10 text-ec-accent">
                  <History size={20} aria-hidden />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ec-text">
                    Last time you chose {lastTitle}
                  </p>
                  <p className="text-sm text-ec-text-muted">
                    Continue with that path, or pick a different role below.
                  </p>
                </div>
              </div>
              <Link
                href={lastHref}
                className="ec-btn-primary shrink-0 justify-center px-5 py-2.5 text-sm"
              >
                Resume as {lastTitle}
              </Link>
            </div>
          </div>
        ) : null}

        <div className="mx-auto mt-12 max-w-6xl">
          <h2 className="mb-4 text-left text-lg font-bold text-ec-text md:text-xl">
            Importers and sellers
          </h2>
          <p className="mb-5 max-w-2xl text-left text-sm text-ec-text-secondary">
            These roles cover most trade on the platform. Pick importer or
            seller if that is how you use Ethio-Chain.
          </p>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-6">
            {primary.map((role) => (
              <RoleCardLink key={role.id} role={role} />
            ))}
          </div>
        </div>

        <div className="mx-auto mt-14 max-w-6xl border-t border-ec-border pt-12">
          <h2 className="mb-2 text-left text-base font-semibold text-ec-text-secondary md:text-lg">
            Partners and service roles
          </h2>
          <p className="mb-5 max-w-2xl text-left text-sm text-ec-text-muted">
            Same platform, different role types. Carriers, customs, ESL staff,
            and platform admins also register here with their own checks.
          </p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 lg:gap-6">
            {secondary.map((role) => (
              <RoleCardLink key={role.id} role={role} />
            ))}
          </div>
        </div>

        <p className="mx-auto mt-12 max-w-lg text-center text-sm text-ec-text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold text-ec-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
          >
            Sign in
          </Link>
        </p>
      </main>

      <footer className="border-t border-ec-border bg-ec-card py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 md:flex-row md:justify-between md:px-8">
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-ec-text-muted">
            <span className="text-ec-text-secondary">Need help?</span>
            <a
              href="mailto:hello@ethio-chain.local"
              className="font-medium text-ec-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
            >
              hello@ethio-chain.local
            </a>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-ec-surface-raised px-3 py-1.5 text-xs font-semibold text-ec-text-secondary ring-1 ring-ec-border">
            <ShieldCheck className="text-emerald-600" size={14} aria-hidden />
            Secure connection
          </div>
        </div>
      </footer>
    </div>
  );
}
