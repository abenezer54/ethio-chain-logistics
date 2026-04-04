import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Section, SectionContainer } from "./Section";

export function LandingCTA() {
  return (
    <Section id="cta" scrollMargin className="bg-ec-card py-16 md:py-24">
      <SectionContainer>
        <div className="relative overflow-hidden rounded-3xl border border-ec-border bg-gradient-to-br from-ec-navy via-ec-navy-dark to-ec-navy px-6 py-14 text-center shadow-2xl md:px-16 md:py-20">
          <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-ec-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-20 h-48 w-48 rounded-full bg-white/5 blur-3xl" />
          <div className="relative mx-auto max-w-2xl">
            <h2 className="text-3xl font-extrabold tracking-tight text-white md:text-4xl">
              Ready to join the lane?
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-slate-300">
              Start as an importer or seller if that matches your work, or pick
              a partner role. Upload what we need to verify you, then sign in
              after an admin activates your account.
            </p>
            <div className="mt-10 flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:justify-center sm:gap-4">
              <Link
                href="/role-selection"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-ec-accent px-8 py-4 text-base font-bold text-white shadow-lg transition-all duration-300 ease-out hover:bg-ec-accent-hover hover:shadow-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ec-navy active:scale-[0.98] motion-reduce:active:scale-100"
              >
                Choose my role
                <ArrowRight size={20} aria-hidden />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center rounded-xl border border-white/25 px-8 py-4 text-base font-semibold text-white transition-all duration-300 ease-out hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white active:scale-[0.99]"
              >
                View platform basics
              </a>
            </div>
          </div>
        </div>
      </SectionContainer>
    </Section>
  );
}
