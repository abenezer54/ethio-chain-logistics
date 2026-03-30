import { ArrowUpRight, Clock, Network } from "lucide-react";
import { Section, SectionContainer } from "./Section";

export function LandingNetwork() {
  return (
    <Section id="network" scrollMargin className="bg-ec-surface py-20 md:py-28">
      <SectionContainer>
        <div className="overflow-hidden rounded-3xl border border-ec-border bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-8 shadow-2xl transition-shadow duration-300 hover:shadow-ec-navy/20 md:p-12 lg:p-14">
          <div className="flex flex-col gap-10 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/5 transition-transform duration-200 ease-in-out hover:scale-105">
                <Network className="text-white" size={36} />
              </span>
              <div>
                <h2 className="text-2xl font-bold text-white md:text-3xl">
                  Uptime you can plan around
                </h2>
                <p className="mt-2 max-w-xl text-slate-400">
                  The portal stays aligned across offices so buyers and sellers
                  are not arguing over yesterday&apos;s spreadsheet row.
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1.5 text-sm font-medium text-emerald-400">
                    <span className="relative flex h-2 w-2">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                    </span>
                    Online
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full bg-white/5 px-3 py-1.5 text-sm text-slate-400">
                    <Clock size={14} />
                    Fast sync
                  </span>
                </div>
              </div>
            </div>
            <a
              href="#cta"
              className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/5 px-8 py-4 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/10 sm:self-center lg:self-auto"
            >
              Register for access
              <ArrowUpRight size={18} aria-hidden />
            </a>
          </div>
        </div>
      </SectionContainer>
    </Section>
  );
}
