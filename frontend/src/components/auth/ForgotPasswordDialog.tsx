"use client";

import { useEffect, useId, useRef, useState } from "react";
import { X } from "lucide-react";
import { apiFetch } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";

type ForgotPasswordDialogProps = {
  open: boolean;
  onClose: () => void;
};

function normalizeCode(code: string) {
  return code.replace(/\D/g, "").slice(0, 6);
}

export function ForgotPasswordDialog({
  open,
  onClose,
}: ForgotPasswordDialogProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState<"request" | "confirm" | "done">("request");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    closeRef.current?.focus();
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      setStep("request");
      setCode("");
      setPassword("");
      setMessage("");
    }
  }, [open]);

  if (!open) return null;

  async function requestCode() {
    if (!email.trim()) {
      setMessage("Enter the email for your account.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/api/v1/auth/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setStep("confirm");
      setMessage("If that account exists, a reset code has been sent.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not send reset code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirmReset() {
    const cleanCode = normalizeCode(code);
    if (!email.trim() || cleanCode.length !== 6 || password.length < 8) {
      setMessage("Enter the 6-digit code and a password with at least 8 characters.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await apiFetch("/api/v1/auth/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          code: cleanCode,
          new_password: password,
        }),
      });
      setStep("done");
      setMessage("Your password has been updated.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Could not reset password.");
    } finally {
      setBusy(false);
    }
  }

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
            Reset password
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

        <div className="mt-5 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="ec-label">Email</span>
            <input
              className="ec-input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={busy || step === "done"}
            />
          </label>

          {step === "confirm" ? (
            <>
              <label className="flex flex-col gap-1.5">
                <span className="ec-label">Reset code</span>
                <input
                  className="ec-input"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(normalizeCode(e.target.value))}
                  disabled={busy}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="ec-label">New password</span>
                <input
                  className="ec-input"
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
              </label>
            </>
          ) : null}

          {message ? (
            <p className="text-sm text-ec-text-secondary" role="status">
              {message}
            </p>
          ) : null}
        </div>

        {step === "done" ? (
          <button type="button" className="ec-btn-primary mt-6 w-full" onClick={onClose}>
            Back to sign in
          </button>
        ) : step === "confirm" ? (
          <div className="mt-6 flex flex-col gap-3">
            <button
              type="button"
              className="ec-btn-primary w-full"
              onClick={confirmReset}
              disabled={busy}
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner size="sm" label="Resetting password" />
                  Resetting password
                </span>
              ) : (
                "Reset password"
              )}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-ec-accent underline-offset-2 hover:underline disabled:opacity-60"
              onClick={requestCode}
              disabled={busy}
            >
              Resend code
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="ec-btn-primary mt-6 w-full"
            onClick={requestCode}
            disabled={busy}
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner size="sm" label="Sending code" />
                Sending code
              </span>
            ) : (
              "Send reset code"
            )}
          </button>
        )}
      </div>
    </div>
  );
}
