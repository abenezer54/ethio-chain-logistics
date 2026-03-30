import { ArrowUpRight } from "lucide-react";
import { Section, SectionContainer } from "./Section";
import { SectionHeader } from "./SectionHeader";
import { features } from "./data";

export function LandingFeatures() {
  return (
    <Section id="features" scrollMargin className="bg-ec-surface py-20 md:py-28">
      <SectionContainer>
        <SectionHeader
          eyebrow="For buyers and sellers"
          title="What you get on Ethio-Chain"
          description="Importers and sellers stay at the center. These three pieces are what teams ask for first when freight is moving fast."
        />
        <div className="grid gap-6 md:grid-cols-2 md:gap-8 lg:grid-cols-3">
          {features.map((f) => (
            <article
              key={f.title}
              className="group flex flex-col rounded-3xl border border-ec-border bg-ec-card p-8 shadow-sm transition-all duration-200 ease-in-out hover:-translate-y-1 hover:border-ec-accent/25 hover:shadow-xl"
            >
              <span className="mb-6 inline-flex w-fit rounded-2xl bg-ec-navy/5 p-4 transition-all duration-200 ease-in-out group-hover:bg-ec-accent">
                <f.icon
                  className="text-ec-navy transition-colors duration-200 group-hover:text-white"
                  size={28}
                  strokeWidth={2}
                />
              </span>
              <h3 className="text-xl font-bold text-ec-navy">{f.title}</h3>
              <p className="mt-3 flex-1 text-[15px] leading-relaxed text-ec-text-secondary">
                {f.description}
              </p>
              <a
                href="#how-it-works"
                className="mt-6 inline-flex items-center gap-1 text-sm font-semibold text-ec-accent opacity-0 transition-opacity duration-200 group-hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
              >
                See the steps
                <ArrowUpRight size={16} aria-hidden />
              </a>
            </article>
          ))}
        </div>
      </SectionContainer>
    </Section>
  );
}
