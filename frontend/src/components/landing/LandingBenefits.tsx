import { ArrowRight, Package, Store, Users } from "lucide-react";
import Link from "next/link";
import { Section, SectionContainer } from "./Section";
import { SectionHeader } from "./SectionHeader";

const pillars = [
  {
    title: "Importers",
    badge: "Primary",
    icon: Package,
    body: "Bring purchase orders, licenses, and customs paperwork into one trail. See handoffs without chasing three inboxes.",
    href: "/signup?role=IMPORTER",
    emphasis: true,
  },
  {
    title: "Sellers",
    badge: "Primary",
    icon: Store,
    body: "Keep export permits and buyer-facing docs aligned with the same timeline your freight is on.",
    href: "/signup?role=SELLER",
    emphasis: true,
  },
  {
    title: "Partners",
    badge: "Also supported",
    icon: Users,
    body: "Carriers, customs, and ESL teams join when it is their step. Same lane, clear roles.",
    href: "/role-selection",
    emphasis: false,
  },
] as const;

export function LandingBenefits() {
  return (
    <Section
      id="who-its-for"
      scrollMargin
      className="border-b border-ec-border bg-ec-surface-raised py-20 md:py-24"
    >
      <SectionContainer>
        <SectionHeader
          eyebrow="Who Ethio-Chain serves first"
          title="Built around buyers and sellers on the corridor"
          description="Start here if you move goods between Ethiopia and Djibouti. Partner roles plug in when the workflow needs them."
        />
        <div className="grid gap-6 lg:grid-cols-3 lg:gap-8">
          {pillars.map((p) => (
            <article
              key={p.title}
              className={`group relative flex flex-col rounded-3xl border bg-ec-card p-8 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-xl ${
                p.emphasis
                  ? "border-ec-accent/25 ring-1 ring-ec-accent/10 hover:border-ec-accent/50"
                  : "border-ec-border hover:border-ec-border-strong"
              }`}
            >
              <div className="mb-5 flex items-start justify-between gap-3">
                <span
                  className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl transition-colors duration-300 ${
                    p.emphasis
                      ? "bg-ec-accent/10 text-ec-accent group-hover:bg-ec-accent group-hover:text-white"
                      : "bg-ec-navy/5 text-ec-navy group-hover:bg-ec-navy/10"
                  }`}
                >
                  <p.icon size={28} strokeWidth={1.75} aria-hidden />
                </span>
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                    p.emphasis
                      ? "bg-ec-accent/15 text-ec-accent"
                      : "bg-ec-surface text-ec-text-muted"
                  }`}
                >
                  {p.badge}
                </span>
              </div>
              <h3 className="text-xl font-bold text-ec-navy">{p.title}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ec-text-secondary">
                {p.body}
              </p>
              <Link
                href={p.href}
                className={`mt-8 inline-flex items-center gap-2 text-sm font-bold transition-all duration-200 ${
                  p.emphasis
                    ? "text-ec-accent hover:gap-3"
                    : "text-ec-text-secondary hover:text-ec-accent"
                }`}
              >
                {p.emphasis ? "Start registration" : "View roles"}
                <ArrowRight size={18} aria-hidden />
              </Link>
            </article>
          ))}
        </div>
      </SectionContainer>
    </Section>
  );
}
