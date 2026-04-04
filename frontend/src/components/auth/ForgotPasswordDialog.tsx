"use client";

import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

type ForgotPasswordDialogProps = {
  open: boolean;
  onClose: () => void;
};

export function ForgotPasswordDialog({ open, onClose }: ForgotPasswordDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-ec-text/40 p-4 sm:items-center"
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-md rounded-2xl border border-ec-border bg-ec-card p-6 shadow-xl"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="text-lg font-bold text-ec-text">
            Forgot your password?
          </h2>
          <button
            ref={closeRef}
            type="button"
            className="rounded-lg p-1.5 text-ec-text-muted hover:bg-ec-surface hover:text-ec-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ec-text-secondary">
          We do not offer self-service password reset on Ethio-Chain yet. If you
          are locked out, ask your organization&apos;s Ethio-Chain admin or write
          to{" "}
          <a
            href="mailto:hello@ethio-chain.local"
            className="font-medium text-ec-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
          >
            hello@ethio-chain.local
          </a>
          .
        </p>
        <button
          type="button"
          className="ec-btn-primary mt-6 w-full"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
}
