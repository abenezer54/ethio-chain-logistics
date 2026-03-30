type SectionHeaderProps = {
  eyebrow: string;
  title: string;
  description?: string;
  align?: "center" | "left";
};

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "center",
}: SectionHeaderProps) {
  const alignClass =
    align === "center"
      ? "mx-auto max-w-3xl text-center"
      : "max-w-2xl text-left";

  const descClass =
    align === "center"
      ? "mx-auto mt-5 max-w-2xl text-base leading-relaxed text-ec-text-secondary md:text-lg"
      : "mt-5 max-w-2xl text-base leading-relaxed text-ec-text-secondary md:text-lg";

  return (
    <div className={`mb-12 md:mb-16 ${alignClass}`}>
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-ec-accent md:text-sm">
        {eyebrow}
      </p>
      <h2 className="text-3xl font-extrabold tracking-tight text-ec-navy md:text-4xl lg:text-[2.5rem] lg:leading-[1.15]">
        {title}
      </h2>
      {description ? (
        <p className={descClass}>{description}</p>
      ) : null}
    </div>
  );
}
