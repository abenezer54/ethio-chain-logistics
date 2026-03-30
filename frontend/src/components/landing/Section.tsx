import type { ReactNode } from "react";

/** Consistent horizontal padding and max width for all landing sections (mobile-first). */
export function SectionContainer({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 ${className}`}
    >
      {children}
    </div>
  );
}

type SectionProps = {
  id?: string;
  children: ReactNode;
  className?: string;
  /** Offset for sticky header when using anchor links */
  scrollMargin?: boolean;
};

export function Section({
  id,
  children,
  className = "",
  scrollMargin = false,
}: SectionProps) {
  return (
    <section
      id={id}
      className={`${scrollMargin ? "scroll-mt-20 md:scroll-mt-24" : ""} ${className}`}
    >
      {children}
    </section>
  );
}
