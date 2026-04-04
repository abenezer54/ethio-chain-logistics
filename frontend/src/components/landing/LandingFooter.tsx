import Link from "next/link";
import { Network } from "lucide-react";
import { SectionContainer } from "./Section";

const footerColumns = [
  {
    title: "Product",
    links: [
      { href: "#features", label: "Platform" },
      { href: "#how-it-works", label: "How it works" },
      { href: "/role-selection", label: "Register and sign in" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "#", label: "About" },
      { href: "#", label: "Contact" },
      { href: "#", label: "Status" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "#", label: "Privacy" },
      { href: "#", label: "Terms" },
    ],
  },
] as const;

const linkClass =
  "rounded-md text-slate-400 transition-colors duration-200 ease-in-out hover:text-ec-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950";

export function LandingFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-slate-800 bg-slate-950">
      <SectionContainer className="flex flex-col gap-14 py-14 md:flex-row md:items-start md:justify-between lg:py-20">
        <div className="flex max-w-sm flex-col items-center gap-3 md:items-start">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-ec-accent shadow-lg transition-transform duration-200 hover:scale-105">
              <Network className="text-white" size={24} />
            </span>
            <span className="text-xl font-bold tracking-tight text-white">
              Ethio-Chain Logistics
            </span>
          </div>
          <p className="text-center text-sm leading-relaxed text-slate-400 md:text-left">
            Less back and forth on documents. Built for teams moving freight
            between Ethiopia and Djibouti, with importers and sellers up front.
          </p>
          <a
            href="mailto:hello@ethio-chain.local"
            className="mt-1 rounded-md text-sm font-medium text-slate-400 transition-colors duration-200 hover:text-ec-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
          >
            hello@ethio-chain.local
          </a>
        </div>

        <div className="grid grid-cols-2 gap-10 sm:grid-cols-3 md:gap-16">
          {footerColumns.map((col) => (
            <div key={col.title}>
              <p className="mb-4 text-xs font-bold uppercase tracking-widest text-slate-500">
                {col.title}
              </p>
              <ul className="flex flex-col gap-2.5 text-sm">
                {col.links.map((item) => (
                  <li key={item.label}>
                    {item.href.startsWith("/") ? (
                      <Link href={item.href} className={linkClass}>
                        {item.label}
                      </Link>
                    ) : (
                      <a href={item.href} className={linkClass}>
                        {item.label}
                      </a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </SectionContainer>

      <div className="border-t border-slate-800">
        <SectionContainer className="flex flex-col items-center justify-between gap-3 py-6 sm:flex-row">
          <p className="text-xs text-slate-500">
            © {year} Ethio-Chain Logistics. All rights reserved.
          </p>
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-400">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
            Systems operational
          </p>
        </SectionContainer>
      </div>
    </footer>
  );
}
