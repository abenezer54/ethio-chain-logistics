import { Fragment } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, ShieldCheck, Sparkles } from "lucide-react";
import { SectionContainer } from "./Section";

const statPill = [
  { value: "128+", label: "Corridor partners" },
  { value: "6", label: "Ways to join" },
  { value: "1", label: "Shared lane" },
];

export function LandingHero() {
  return (
    <section className="landing-hero-mesh landing-grid-pattern relative overflow-hidden">
      <SectionContainer className="relative flex flex-col gap-14 pb-24 pt-14 sm:pb-28 sm:pt-16 lg:flex-row lg:items-center lg:gap-20 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="landing-reveal flex max-w-2xl flex-1 flex-col gap-8 lg:gap-10">
          <div className="inline-flex items-center gap-2 self-start rounded-full border border-ec-border bg-ec-card/90 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.2em] text-ec-navy shadow-sm backdrop-blur-sm">
            <Sparkles className="shrink-0 text-ec-accent" size={14} aria-hidden />
            Ethiopia to Djibouti trade corridor
          </div>

          <div className="space-y-5">
            <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ec-text sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
              One place for{" "}
              <span className="relative whitespace-nowrap text-ec-accent">
                imports and exports
                <span
                  className="absolute -bottom-1 left-0 right-0 h-1 rounded-full bg-ec-accent/25"
                  aria-hidden
                />
              </span>
            </h1>
            <p className="max-w-xl text-lg leading-relaxed text-ec-text-secondary sm:text-xl">
              Ethio-Chain gives importers and sellers a shared record for the
              lane. Carriers and offices step in when it is their turn, so you
              spend less time reconciling chats and PDFs.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <Link
              href="/role-selection"
              className="group inline-flex items-center justify-center gap-2 rounded-xl bg-ec-accent px-8 py-4 text-center text-base font-bold text-white shadow-xl shadow-ec-accent/25 transition-all duration-300 ease-out hover:bg-ec-accent-hover hover:shadow-ec-accent/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 active:scale-[0.98] motion-reduce:active:scale-100"
            >
              Register for the corridor
              <ArrowRight
                className="transition-transform duration-300 ease-out group-hover:translate-x-1"
                size={20}
                aria-hidden
              />
            </Link>
            <a
              href="#who-its-for"
              className="inline-flex items-center justify-center rounded-xl border-2 border-ec-text/80 bg-ec-card/80 px-8 py-4 text-base font-bold text-ec-text backdrop-blur-sm transition-all duration-300 ease-out hover:border-ec-accent hover:text-ec-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-text focus-visible:ring-offset-2 active:scale-[0.99] motion-reduce:active:scale-100"
            >
              See who it is for
            </a>
          </div>

          <div className="flex flex-wrap items-center gap-y-4 border-t border-ec-border/80 pt-8">
            {statPill.map((s, i) => (
              <Fragment key={s.label}>
                {i > 0 ? (
                  <div
                    className="mx-4 hidden h-10 w-px bg-ec-border sm:mx-6 sm:block"
                    aria-hidden
                  />
                ) : null}
                <div>
                  <p className="text-2xl font-bold tabular-nums text-ec-navy">
                    {s.value}
                  </p>
                  <p className="text-sm text-ec-text-muted">{s.label}</p>
                </div>
              </Fragment>
            ))}
          </div>
        </div>

        <div className="landing-reveal landing-reveal-delay-1 relative flex flex-1 justify-center lg:max-w-xl">
          <div className="absolute -right-8 -top-8 hidden h-64 w-64 rounded-full bg-ec-accent/10 blur-3xl lg:block" />
          <div className="absolute -bottom-8 -left-8 hidden h-48 w-48 rounded-full bg-ec-navy/10 blur-3xl lg:block" />
          <div className="relative w-full">
            <div className="relative overflow-hidden rounded-3xl border border-ec-border bg-ec-card shadow-2xl shadow-ec-navy/10 ring-1 ring-black/5 transition-all duration-500 ease-out hover:shadow-ec-navy/20">
              <Image
                src="/shipping-container-1.webp"
                alt="Shipping containers at a logistics hub"
                width={640}
                height={420}
                className="aspect-[4/3] w-full object-cover"
                priority
                sizes="(max-width: 1024px) 100vw, 560px"
              />
            </div>
            <div className="absolute -bottom-6 left-4 right-4 sm:-bottom-8 sm:left-8 sm:right-auto sm:max-w-sm">
              <div className="flex items-center gap-4 rounded-2xl border border-ec-border bg-ec-card/95 p-4 shadow-xl backdrop-blur-md transition-all duration-300 ease-out hover:border-ec-border-strong hover:shadow-2xl">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-emerald-100">
                  <ShieldCheck className="text-emerald-700" size={26} />
                </span>
                <div>
                  <p className="font-bold text-ec-navy">Checked uploads</p>
                  <p className="text-sm text-ec-text-muted">
                    Each file gets a fingerprint so changes show up in review
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
