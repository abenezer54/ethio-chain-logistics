"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, MailWarning } from "lucide-react";
import { AuthCard, AuthShell, LabeledInput } from "@/components/auth";
import { Spinner } from "@/components/ui/Spinner";
import { apiFetch } from "@/lib/api";

type VerifyState = "idle" | "success" | "error";

function normalizeCode(code: string) {
  return code.replace(/\D/g, "").slice(0, 6);
}

export default function VerifyEmailClient() {
  const params = useSearchParams();
  const [email, setEmail] = useState(params.get("email") ?? "");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [changeOpen, setChangeOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [state, setState] = useState<VerifyState>("idle");
  const [message, setMessage] = useState(
    "Enter the 6-digit code we sent to your email."
  );

  async function verify() {
    const cleanCode = normalizeCode(code);
    if (!email.trim() || cleanCode.length !== 6) {
      setState("error");
      setMessage("Enter your email and the 6-digit verification code.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: cleanCode }),
      });
      setState("success");
      setMessage("Your email is verified. Your account can now be reviewed.");
    } catch (e) {
      setState("error");
      setMessage(
        e instanceof Error
          ? e.message
          : "This verification code is invalid or expired."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resend() {
    if (!email.trim()) {
      setState("error");
      setMessage("Enter your email address first.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setState("idle");
      setMessage("We sent a new 6-digit code. Check your inbox.");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Could not resend the code.");
    } finally {
      setBusy(false);
    }
  }

  async function changeEmail() {
    if (!email.trim() || !password || !newEmail.trim()) {
      setState("error");
      setMessage("Enter your current email, password, and new email.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/auth/change-unverified-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          current_email: email.trim(),
          password,
          new_email: newEmail.trim(),
        }),
      });
      setEmail(newEmail.trim());
      setNewEmail("");
      setPassword("");
      setCode("");
      setChangeOpen(false);
      setState("idle");
      setMessage("Email updated. We sent a new 6-digit code.");
    } catch (e) {
      setState("error");
      setMessage(e instanceof Error ? e.message : "Could not change email.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell maxWidthClass="max-w-md">
      <AuthCard>
        <div className="text-center">
          {state === "success" ? (
            <CheckCircle2
              size={44}
              className="mx-auto text-emerald-600"
              aria-hidden
            />
          ) : state === "error" ? (
            <MailWarning
              size={44}
              className="mx-auto text-ec-danger"
              aria-hidden
            />
          ) : null}
          <h1 className="text-2xl font-bold text-ec-text">
            {state === "success" ? "Email verified" : "Verify your email"}
          </h1>
          <p className="mt-3 text-sm text-ec-text-secondary">{message}</p>
        </div>

        {state !== "success" ? (
          <div className="mt-7 flex flex-col gap-5">
            <LabeledInput
              label="Email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={setEmail}
              disabled={busy}
            />
            <LabeledInput
              label="Verification code"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="123456"
              value={code}
              onChange={(v) => setCode(normalizeCode(v))}
              disabled={busy}
            />
            <button
              type="button"
              className="ec-btn-navy w-full py-3"
              onClick={verify}
              disabled={busy}
            >
              {busy ? (
                <span className="inline-flex items-center justify-center gap-2">
                  <Spinner
                    size="sm"
                    label="Verifying code"
                    className="border-white/25 border-t-white"
                  />
                  Verifying code
                </span>
              ) : (
                "Verify email"
              )}
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-ec-accent underline-offset-2 hover:underline disabled:opacity-60"
              onClick={resend}
              disabled={busy}
            >
              Resend code
            </button>
            <button
              type="button"
              className="text-sm font-semibold text-ec-text-secondary underline-offset-2 hover:text-ec-accent hover:underline disabled:opacity-60"
              onClick={() => setChangeOpen((v) => !v)}
              disabled={busy}
            >
              Change email address
            </button>
            {changeOpen ? (
              <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-4 text-left">
                <div className="flex flex-col gap-4">
                  <LabeledInput
                    label="New email"
                    type="email"
                    autoComplete="email"
                    value={newEmail}
                    onChange={setNewEmail}
                    disabled={busy}
                  />
                  <LabeledInput
                    label="Password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={setPassword}
                    disabled={busy}
                  />
                  <button
                    type="button"
                    className="ec-btn-primary w-full"
                    onClick={changeEmail}
                    disabled={busy}
                  >
                    Save new email
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <Link href="/login" className="ec-btn-navy mt-7 w-full py-3">
            Continue to sign in
          </Link>
        )}
      </AuthCard>
    </AuthShell>
  );
}
