import { SectionContainer } from "./Section";
import { stats } from "./data";

export function LandingStats() {
  return (
    <section className="bg-ec-navy py-16 text-white md:py-20">
      <SectionContainer>
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4 lg:gap-12">
          {stats.map((s) => (
            <div
              key={s.label}
              className="group text-center transition-transform duration-300 ease-out hover:scale-[1.02] sm:text-left"
            >
              <p className="font-mono text-4xl font-bold tracking-tight text-white transition-transform duration-300 group-hover:scale-105 md:text-5xl">
                {s.value}
              </p>
              <p className="mt-2 text-lg font-semibold text-white/95">{s.label}</p>
              <p className="mt-1 text-sm text-slate-400">{s.sub}</p>
            </div>
          ))}
        </div>
      </SectionContainer>
    </section>
  );
}
