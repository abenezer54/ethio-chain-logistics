"use client";

import { ArrowLeft } from "lucide-react";

export function BackButton() {
  return (
    <button
      type="button"
      onClick={() => window.history.back()}
      className="inline-flex items-center gap-2 text-sm font-medium text-ec-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
    >
      <ArrowLeft size={16} aria-hidden />
      Go back
    </button>
  );
}
