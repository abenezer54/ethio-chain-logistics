import Link from "next/link";
import { Network } from "lucide-react";

type PortalHeaderProps = {
  title: string;
  subtitle?: string;
  /** Extra right-side actions (e.g. sign out button) */
  actions?: React.ReactNode;
};

export function PortalHeader({ title, subtitle, actions }: PortalHeaderProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-ec-border bg-ec-card/95 shadow-sm backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-8">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <Link
            href="/"
            className="group flex shrink-0 items-center gap-2 rounded-lg outline-none ring-offset-2 ring-offset-ec-card focus-visible:ring-2 focus-visible:ring-ec-accent"
            aria-label="Ethio-Chain Logistics home"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-ec-accent shadow-sm transition-transform group-hover:scale-[1.02]">
              <Network className="text-white" size={20} aria-hidden />
            </span>
            <span className="hidden font-bold text-ec-text sm:inline">
              Ethio-Chain
            </span>
          </Link>
          <div className="min-w-0 border-l border-ec-border pl-3">
            <h1 className="truncate text-base font-bold text-ec-text md:text-lg">
              {title}
            </h1>
            {subtitle ? (
              <p className="truncate text-xs text-ec-text-muted md:text-sm">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>
        {actions ? (
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
