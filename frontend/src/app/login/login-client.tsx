"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import {
  AuthShell,
  AuthCard,
  LabeledInput,
  PasswordField,
  ForgotPasswordDialog,
} from "@/components/auth";
import { setStoredToken } from "@/lib/auth-storage";
import {
  type LoginResponse,
  resolvePostLoginRedirect,
} from "@/lib/auth-redirect";
import { apiFetch } from "@/lib/api";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastProvider";

function errorMessage(e: unknown): string | null {
  if (!e) return null;
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return null;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

export default function LoginClient() {
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextParam = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [touched, setTouched] = useState({ email: false, password: false });

  const emailError =
    touched.email && email.trim() && !looksLikeEmail(email)
      ? "Enter a valid email address."
      : touched.email && !email.trim()
        ? "Email is required."
        : undefined;

  const passwordError =
    touched.password && !password
      ? "Enter your password."
      : undefined;

  const canSubmit = useMemo(
    () => looksLikeEmail(email.trim()) && Boolean(password),
    [email, password]
  );

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setTouched({ email: true, password: true });
    if (!looksLikeEmail(email.trim()) || !password) return;

    setBusy(true);
    try {
      const res = await apiFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password,
        }),
      });
      setStoredToken(res.token, remember);
      const dest = resolvePostLoginRedirect(res.user.role, nextParam);
      toast(
        remember
          ? "Signed in to Ethio-Chain. Staying logged in on this device."
          : "Signed in to Ethio-Chain.",
        "success"
      );
      setTimeout(() => router.push(dest), 400);
    } catch (err: unknown) {
      const errText =
        errorMessage(err) ??
        "Could not sign you in. Check your email and password and try again.";
      toast(errText, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell>
      <AuthCard className="mx-auto">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold tracking-tight text-ec-text">
            Sign in to Ethio-Chain
          </h1>
          <p className="mt-2 text-sm text-ec-text-secondary">
            Use the email and password you chose when you registered for the
            Ethio-Chain logistics platform. Your role is tied to that account.
          </p>
        </div>

        <form onSubmit={onSubmit} className="flex flex-col gap-5" noValidate>
          <LabeledInput
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            value={email}
            onChange={setEmail}
            onBlur={() => setTouched((t) => ({ ...t, email: true }))}
            error={emailError}
            success={Boolean(email.trim()) && looksLikeEmail(email) && !emailError}
            disabled={busy}
          />
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            onBlur={() => setTouched((t) => ({ ...t, password: true }))}
            error={passwordError}
            success={Boolean(password) && !passwordError}
            disabled={busy}
          />

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex cursor-pointer items-center gap-2 text-sm text-ec-text-secondary">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                disabled={busy}
              />
              <span>Stay signed in on this device</span>
            </label>
            <button
              type="button"
              className="text-sm font-medium text-ec-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded text-left sm:text-right"
              onClick={() => setForgotOpen(true)}
            >
              Forgot password?
            </button>
          </div>

          <button
            type="submit"
            disabled={busy || !canSubmit}
            className="ec-btn-primary w-full py-3 text-base shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
            aria-busy={busy}
          >
            {busy ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Spinner size="sm" label="Signing in" />
                Signing you in…
              </span>
            ) : (
              "Sign in to Ethio-Chain"
            )}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-ec-text-muted">
          New here?{" "}
          <Link
            href="/role-selection"
            className="font-semibold text-ec-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
          >
            Choose a role and register for Ethio-Chain
          </Link>
        </p>

        <p className="mt-4 border-t border-ec-border pt-4 text-center text-xs text-ec-text-muted">
          Google or Microsoft sign-in is not available yet. Use your work email
          and password.
        </p>
      </AuthCard>

      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </AuthShell>
  );
}
