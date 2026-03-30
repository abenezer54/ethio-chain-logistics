import { Section, SectionContainer } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { steps } from "./data";

export function LandingHowItWorks() {
  return (
    <Section
      id="how-it-works"
      scrollMargin
      className="border-y border-ec-border bg-ec-card py-20 md:py-28"
    >
      <SectionContainer>
        <SectionHeader
          eyebrow="How it works"
          title="From signup to a trail you can show"
          description="Plain steps most teams follow in the first month. No buzzwords, just the order of work."
        />
        <div className="grid gap-6 md:grid-cols-3 md:gap-8">
          {steps.map((s) => (
            <div
              key={s.step}
              className="rounded-3xl border border-ec-border bg-ec-surface-raised p-8 shadow-sm transition-all duration-300 ease-out hover:-translate-y-1 hover:border-ec-accent/25 hover:shadow-lg"
            >
              <div className="mb-6 flex items-start justify-between gap-4">
                <span className="inline-flex rounded-xl bg-ec-navy/10 p-3 text-ec-navy ring-1 ring-ec-navy/5">
                  <s.icon size={24} aria-hidden />
                </span>
                <span className="font-mono text-2xl font-bold tabular-nums text-ec-accent/35 md:text-3xl">
                  {s.step}
                </span>
              </div>
              <h3 className="text-lg font-bold text-ec-text">{s.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-ec-text-secondary md:text-base">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </Section>
  );
}
