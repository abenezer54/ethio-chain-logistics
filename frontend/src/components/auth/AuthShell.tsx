import Link from "next/link";
import { Network } from "lucide-react";

type AuthShellProps = {
  children: React.ReactNode;
  /** Narrow column for login; wider for signup/KYC */
  maxWidthClass?: string;
};

export function AuthShell({
  children,
  maxWidthClass = "max-w-md",
}: AuthShellProps) {
  return (
    <div className="min-h-screen bg-ec-surface">
      <a
        href="#auth-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-ec-card focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-ec-text focus:shadow-lg focus:ring-2 focus:ring-ec-accent"
      >
        Skip to form
      </a>
      <div className="landing-hero-mesh border-b border-ec-border/80">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Link
              href="/"
              className="group inline-flex min-w-0 items-center gap-3 rounded-xl outline-none ring-offset-2 ring-offset-ec-surface transition-transform hover:opacity-90 focus-visible:ring-2 focus-visible:ring-ec-accent"
              aria-label="Ethio-Chain Logistics home"
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ec-accent shadow-md transition-transform duration-200 group-hover:scale-[1.02]">
                <Network className="text-white" size={22} aria-hidden />
              </span>
              <span className="truncate text-base font-bold tracking-tight text-ec-text">
                Ethio-Chain Logistics
              </span>
            </Link>
            <span className="hidden h-6 w-px bg-ec-border sm:block" aria-hidden />
            <Link
              href="/"
              className="hidden text-sm font-semibold text-ec-text-secondary transition-colors hover:text-ec-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded-md sm:inline"
            >
              Home
            </Link>
          </div>
        </div>
      </div>

      <main
        id="auth-main"
        tabIndex={-1}
        className={`mx-auto w-full px-4 py-10 outline-none md:py-14 ${maxWidthClass}`}
      >
        {children}
      </main>
    </div>
  );
}
