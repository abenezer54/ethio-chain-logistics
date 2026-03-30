"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Menu, Network, X } from "lucide-react";
import { AuthNavLinks } from "@/components/layout/AuthNavLinks";
import { navLinks } from "./data";
import { SectionContainer } from "./Section";

const linkClass =
  "rounded-lg px-3 py-2 text-sm font-medium text-slate-200 transition-all duration-200 ease-in-out hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent lg:px-4";

export function LandingNav() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 6);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 w-full border-b border-white/10 bg-ec-navy/95 backdrop-blur-md transition-shadow duration-300 ${
        scrolled ? "shadow-lg shadow-black/20" : "shadow-sm"
      }`}
    >
      <SectionContainer className="flex h-16 items-center justify-between gap-4 lg:h-[4.25rem]">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-lg outline-none ring-offset-2 ring-offset-ec-navy transition-opacity duration-200 hover:opacity-95 focus-visible:ring-2 focus-visible:ring-ec-accent"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ec-accent shadow-lg shadow-black/20 transition-transform duration-200 ease-in-out hover:scale-[1.02]">
            <Network className="text-white" size={22} aria-hidden />
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-base font-bold tracking-tight text-white sm:text-lg">
              Ethio-Chain
            </span>
            <span className="hidden text-[11px] font-medium uppercase tracking-wider text-slate-400 sm:block">
              Logistics
            </span>
          </div>
        </Link>

        <nav className="hidden items-center gap-1 md:flex lg:gap-2" aria-label="Main">
          {navLinks.map((l) => (
            <a key={l.href} href={l.href} className={linkClass}>
              {l.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <AuthNavLinks className="hidden sm:inline-flex" />
          <Link
            href="/login"
            className="hidden rounded-lg px-3 py-2 text-sm font-semibold text-white/90 transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent sm:inline"
          >
            Sign in
          </Link>
          <Link
            href="/role-selection"
            className="rounded-full bg-ec-accent px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-all duration-200 ease-in-out hover:bg-ec-accent-hover hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ec-navy sm:px-5"
          >
            Choose your role
          </Link>

          <button
            type="button"
            className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white transition-colors duration-200 ease-in-out hover:bg-white/10 md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </SectionContainer>

      {open ? (
        <div
          id="mobile-nav"
          className="border-t border-white/10 bg-ec-navy px-4 py-4 md:hidden"
          role="dialog"
          aria-modal="true"
        >
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            <div className="border-b border-white/10 px-4 pb-3 pt-1">
              <AuthNavLinks className="w-full justify-center" />
            </div>
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="rounded-xl px-4 py-3 text-base font-medium text-slate-200 transition-colors duration-200 hover:bg-white/10"
                onClick={() => setOpen(false)}
              >
                {l.label}
              </a>
            ))}
            <Link
              href="/login"
              className="rounded-xl px-4 py-3 text-center text-base font-semibold text-white/95 transition-colors hover:bg-white/10"
              onClick={() => setOpen(false)}
            >
              Sign in
            </Link>
            <Link
              href="/role-selection"
              className="mt-2 rounded-xl bg-ec-accent py-3 text-center text-base font-semibold text-white transition-colors duration-200 hover:bg-ec-accent-hover"
              onClick={() => setOpen(false)}
            >
              Choose your role
            </Link>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
