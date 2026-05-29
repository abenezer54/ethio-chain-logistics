"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { languageNames } from "./translations";

type LanguageToggleProps = {
  tone?: "dark" | "light";
  className?: string;
};

const toneClasses = {
  dark: "border-white/15 bg-white/5 text-white hover:bg-white/10 focus-visible:ring-white focus-visible:ring-offset-ec-navy",
  light:
    "border-ec-border bg-ec-card text-ec-text hover:bg-ec-surface-raised focus-visible:ring-ec-accent focus-visible:ring-offset-ec-card",
};

export function LanguageToggle({
  tone = "light",
  className = "",
}: LanguageToggleProps) {
  const { language, toggleLanguage } = useLanguage();
  const nextLanguage = language === "en" ? "am" : "en";

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      data-no-translate
      className={`inline-flex h-10 items-center gap-2 rounded-lg border px-3 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${toneClasses[tone]} ${className}`}
      aria-label={`Switch language to ${languageNames[nextLanguage]}`}
      title={`Switch language to ${languageNames[nextLanguage]}`}
    >
      <Languages size={17} aria-hidden />
      <span>{language === "en" ? "አማ" : "EN"}</span>
    </button>
  );
}
