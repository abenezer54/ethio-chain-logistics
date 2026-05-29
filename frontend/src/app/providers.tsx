"use client";

import type { ReactNode } from "react";
import { ToastProvider } from "@/components/ui/ToastProvider";
import { AutoTranslate } from "@/localization/AutoTranslate";
import { LanguageProvider } from "@/localization/LanguageProvider";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <LanguageProvider>
      <ToastProvider>
        <AutoTranslate />
        {children}
      </ToastProvider>
    </LanguageProvider>
  );
}
