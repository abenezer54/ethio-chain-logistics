"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Shield } from "lucide-react";
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

type Role = "IMPORTER" | "SELLER" | "TRANSPORTER" | "CUSTOMS" | "ESL_AGENT";

type SignupState = {
  role: Role;
  email: string;
  password: string;

  full_name: string;
  phone: string;

  business_name: string;
  vat_number: string;
  company_address: string;
  origin_country: string;
  truck_id: string;
  carrier_company: string;
  employee_id: string;
  branch_office: string;
  department: string;
  staff_code: string;
};

function roleLabel(role: Role) {
  switch (role) {
    case "IMPORTER":
      return "Importer";
    case "SELLER":
      return "Seller";
    case "TRANSPORTER":
      return "Transporter";
    case "CUSTOMS":
      return "Customs";
    case "ESL_AGENT":
      return "ESL Agent";
  }
}

function requiredDocs(role: Role) {
  switch (role) {
    case "IMPORTER":
      return [
        { key: "trade_license", label: "Trade license (copy)" },
        { key: "tin_certificate", label: "TIN certificate (scan)" },
      ];
    case "SELLER":
      return [
        { key: "business_registration", label: "Business registration" },
        { key: "export_permit", label: "Export permit" },
      ];
    case "TRANSPORTER":
      return [
        { key: "drivers_license", label: "Driver license" },
        { key: "vehicle_plate_registry", label: "Vehicle plate registry" },
      ];
    case "CUSTOMS":
      return [{ key: "gov_id_badge", label: "Government ID or badge" }];
    case "ESL_AGENT":
      return [
        {
          key: "employment_verification",
          label: "Employment verification letter",
        },
      ];
  }
}

function errorMessage(e: unknown): string | null {
  if (!e) return null;
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return null;
}

function looksLikeEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function roleSignupBlurb(role: Role): string {
  switch (role) {
    case "IMPORTER":
      return "Add your buying business details and upload trade documents so Ethio-Chain can verify you as an importer.";
    case "SELLER":
      return "Add your selling business details and upload export documents so Ethio-Chain can verify you as a seller.";
    case "TRANSPORTER":
      return "Add carrier details and upload license and vehicle papers so Ethio-Chain can verify you as a transporter.";
    case "CUSTOMS":
      return "Add office details and upload ID so Ethio-Chain can verify you as a customs user.";
    case "ESL_AGENT":
      return "Add department details and upload employment proof so Ethio-Chain can verify you as an ESL agent.";
  }
}

const MIN_PASSWORD = 8;

export default function SignupClient() {
  const { toast } = useToast();
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const roleFromQS = (params.get("role") ?? "IMPORTER").toUpperCase();

  const initialRole: Role = ([
    "IMPORTER",
    "SELLER",
    "TRANSPORTER",
    "CUSTOMS",
    "ESL_AGENT",
  ] as const).includes(roleFromQS as Role)
    ? (roleFromQS as Role)
    : "IMPORTER";

  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [busy, setBusy] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState({
    email: false,
    password: false,
  });

  const [state, setState] = useState<SignupState>({
    role: initialRole,
    email: "",
    password: "",
    full_name: "",
    phone: "",
    business_name: "",
    vat_number: "",
    company_address: "",
    origin_country: "",
    truck_id: "",
    carrier_company: "",
    employee_id: "",
    branch_office: "",
    department: "",
    staff_code: "",
  });

  const docs = useMemo(() => requiredDocs(state.role), [state.role]);
  const [uploads, setUploads] = useState<Record<string, File | null>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  const roleFields = useMemo(() => {
    switch (state.role) {
      case "IMPORTER":
        return [
          { key: "business_name", label: "Business name" },
          { key: "vat_number", label: "VAT number" },
        ] as Array<{ key: keyof SignupState; label: string }>;
      case "SELLER":
        return [
          { key: "company_address", label: "Company address" },
          { key: "origin_country", label: "Origin country" },
        ] as Array<{ key: keyof SignupState; label: string }>;
      case "TRANSPORTER":
        return [
          { key: "truck_id", label: "Truck ID" },
          { key: "carrier_company", label: "Carrier company" },
        ] as Array<{ key: keyof SignupState; label: string }>;
      case "CUSTOMS":
        return [
          { key: "employee_id", label: "Employee ID" },
          { key: "branch_office", label: "Branch office" },
        ] as Array<{ key: keyof SignupState; label: string }>;
      case "ESL_AGENT":
        return [
          { key: "department", label: "Department" },
          { key: "staff_code", label: "Staff code" },
        ] as Array<{ key: keyof SignupState; label: string }>;
    }
  }, [state.role]);

  const emailError =
    touched.email && state.email.trim() && !looksLikeEmail(state.email)
      ? "Enter a valid email address."
      : touched.email && !state.email.trim()
        ? "Email is required."
        : undefined;

  const passwordErrorSignup =
    touched.password && mode === "signup" && !state.password
      ? "Choose a password."
      : touched.password &&
          mode === "signup" &&
          state.password.length > 0 &&
          state.password.length < MIN_PASSWORD
        ? `Use at least ${MIN_PASSWORD} characters.`
        : undefined;

  const passwordErrorLogin =
    touched.password && mode === "login" && !state.password
      ? "Enter your password."
      : undefined;

  const passwordError =
    mode === "signup" ? passwordErrorSignup : passwordErrorLogin;

  const signupReady = useMemo(() => {
    if (mode !== "signup") return true;
    if (!looksLikeEmail(state.email.trim())) return false;
    if (state.password.length < MIN_PASSWORD) return false;
    for (const d of docs) {
      if (!uploads[d.key]) return false;
    }
    return true;
  }, [mode, state.email, state.password, docs, uploads]);

  const loginReady = useMemo(() => {
    if (mode !== "login") return true;
    return looksLikeEmail(state.email.trim()) && Boolean(state.password);
  }, [mode, state.email, state.password]);

  async function onSignup() {
    setTouched({ email: true, password: true });
    if (!looksLikeEmail(state.email.trim())) {
      toast("Check the email field and try again.", "warning");
      return;
    }
    if (state.password.length < MIN_PASSWORD) {
      toast(
        `Choose a password with at least ${MIN_PASSWORD} characters.`,
        "warning"
      );
      return;
    }

    const nextUploadErrors: Record<string, string> = {};
    for (const d of docs) {
      if (!uploads[d.key])
        nextUploadErrors[d.key] = "Choose a file for this item.";
    }
    setUploadErrors(nextUploadErrors);
    if (Object.keys(nextUploadErrors).length > 0) {
      toast(
        "Add each required file where marked. We need them to verify your role.",
        "warning"
      );
      return;
    }

    setBusy(true);
    try {
      const fd = new FormData();
      fd.set("role", state.role);
      fd.set("email", state.email.trim());
      fd.set("password", state.password);
      if (state.full_name) fd.set("full_name", state.full_name);
      if (state.phone) fd.set("phone", state.phone);

      for (const f of roleFields) {
        const v = String(state[f.key] ?? "");
        fd.set(f.key, v);
      }

      for (const d of docs) {
        const file = uploads[d.key];
        if (!file) throw new Error(`Missing file: ${d.label}`);
        fd.set(d.key, file);
      }

      await apiFetch("/api/v1/auth/signup", { method: "POST", body: fd });
      toast(
        "Thanks, we received your registration. An administrator will review it and email you when your account is active.",
        "success"
      );
      setMode("login");
    } catch (e: unknown) {
      const errText =
        errorMessage(e) ??
        "We could not send your registration. Check your connection and try again.";
      toast(errText, "error");
    } finally {
      setBusy(false);
    }
  }

  async function onLogin() {
    setTouched({ email: true, password: true });
    if (!looksLikeEmail(state.email.trim()) || !state.password) return;

    setBusy(true);
    try {
      const res = await apiFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: state.email.trim(),
          password: state.password,
        }),
      });
      setStoredToken(res.token, remember);
      const dest = resolvePostLoginRedirect(res.user.role, nextParam);
      toast("Signed in to Ethio-Chain. Opening your account.", "success");
      setTimeout(() => router.push(dest), 450);
    } catch (e: unknown) {
      const errText =
        errorMessage(e) ??
        "We could not sign you in. Check your email and password, then try again.";
      toast(errText, "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell maxWidthClass="max-w-2xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/role-selection"
          className="inline-flex items-center gap-2 text-sm font-medium text-ec-text-secondary transition-colors hover:text-ec-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 rounded-lg"
        >
          <ArrowLeft size={18} aria-hidden />
          Change role
        </Link>
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-ec-card px-3 py-1.5 text-xs font-medium text-ec-text-secondary ring-1 ring-ec-border">
          <Shield size={14} className="text-ec-navy" aria-hidden />
          Ethio-Chain verification before access
        </span>
      </div>

      <div className={mode === "login" ? "mx-auto max-w-md" : ""}>
        <AuthCard>
          <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-ec-text md:text-3xl">
                {mode === "signup"
                  ? "Register for Ethio-Chain"
                  : "Sign in to Ethio-Chain"}
              </h1>
              <p className="mt-2 text-sm text-ec-text-secondary">
                {mode === "signup" ? (
                  <>
                    <span className="font-semibold text-ec-text">
                      Role: {roleLabel(state.role)}.
                    </span>{" "}
                    You are creating one user account on the Ethio-Chain
                    logistics platform (not an application to a single employer).
                    {" "}
                    {roleSignupBlurb(state.role)}
                  </>
                ) : (
                  <>
                    You are signing in as{" "}
                    <span className="font-semibold text-ec-text">
                      {roleLabel(state.role)}
                    </span>
                    . Use the same email and password you used when you
                    registered for Ethio-Chain.
                  </>
                )}
              </p>
            </div>
            <div
              className="inline-flex shrink-0 rounded-xl bg-ec-surface-raised p-1 ring-1 ring-ec-border"
              role="tablist"
              aria-label="Register or sign in to Ethio-Chain"
            >
              <button
                type="button"
                role="tab"
                aria-selected={mode === "signup"}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent ${
                  mode === "signup"
                    ? "bg-ec-card text-ec-text shadow-sm"
                    : "text-ec-text-muted hover:text-ec-text"
                }`}
                onClick={() => {
                  setMode("signup");
                  setTouched({ email: false, password: false });
                }}
              >
                Register
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={mode === "login"}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent ${
                  mode === "login"
                    ? "bg-ec-card text-ec-text shadow-sm"
                    : "text-ec-text-muted hover:text-ec-text"
                }`}
                onClick={() => {
                  setMode("login");
                  setTouched({ email: false, password: false });
                }}
              >
                Sign in
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            <LabeledInput
              label="Email"
              type="email"
              autoComplete="email"
              placeholder="you@company.com"
              value={state.email}
              onChange={(v) => setState({ ...state, email: v })}
              onBlur={() => setTouched((t) => ({ ...t, email: true }))}
              error={emailError}
              success={
                Boolean(state.email.trim()) &&
                looksLikeEmail(state.email) &&
                !emailError
              }
              disabled={busy}
            />
            <PasswordField
              label="Password"
              autoComplete={
                mode === "signup" ? "new-password" : "current-password"
              }
              placeholder={
                mode === "signup"
                  ? `At least ${MIN_PASSWORD} characters`
                  : undefined
              }
              value={state.password}
              onChange={(v) => setState({ ...state, password: v })}
              onBlur={() => setTouched((t) => ({ ...t, password: true }))}
              error={passwordError}
              success={
                mode === "signup"
                  ? state.password.length >= MIN_PASSWORD && !passwordError
                  : Boolean(state.password) && !passwordError
              }
              disabled={busy}
            />

            {mode === "signup" ? (
              <>
                <LabeledInput
                  label="Full name (optional)"
                  autoComplete="name"
                  value={state.full_name}
                  onChange={(v) => setState({ ...state, full_name: v })}
                  disabled={busy}
                />
                <LabeledInput
                  label="Phone (optional)"
                  type="tel"
                  autoComplete="tel"
                  placeholder="+251 91 234 5678"
                  value={state.phone}
                  onChange={(v) => setState({ ...state, phone: v })}
                  disabled={busy}
                />
              </>
            ) : null}
          </div>

          {mode === "login" ? (
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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
          ) : null}

          {mode === "signup" ? (
            <>
              <div className="mt-10 border-t border-ec-border pt-8">
                <h2 className="text-lg font-bold text-ec-text">
                  Details for your role
                </h2>
                <p className="mt-1 text-sm text-ec-text-muted">
                  We use this to verify you in the role you chose. Enter the
                  legal name and numbers that match your organization on
                  official paperwork.
                </p>
                <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-2">
                  {roleFields.map((f) => (
                    <label key={f.key} className="flex flex-col gap-1.5">
                      <span className="ec-label">{f.label}</span>
                      <input
                        className="ec-input"
                        value={String(state[f.key] ?? "")}
                        onChange={(e) =>
                          setState({ ...state, [f.key]: e.target.value })
                        }
                        disabled={busy}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <div className="mt-10 border-t border-ec-border pt-8">
                <h2 className="text-lg font-bold text-ec-text">
                  Upload documents for Ethio-Chain
                </h2>
                <p className="mt-1 text-sm text-ec-text-muted">
                  These files go to platform administrators who review your role.
                  PDF or clear photos, up to 25 MB each. Good scans speed up
                  review.
                </p>
                <div className="mt-5 flex flex-col gap-4">
                  {docs.map((d) => (
                    <label
                      key={d.key}
                      className={`ec-surface-panel flex cursor-pointer flex-col gap-2 transition-colors hover:border-ec-border-strong focus-within:ring-2 focus-within:ring-ec-accent/30 ${
                        uploadErrors[d.key] ? "ring-2 ring-ec-danger/40" : ""
                      }`}
                    >
                      <span className="text-sm font-semibold text-ec-text">
                        {d.label}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,image/*"
                        className="text-sm text-ec-text-secondary file:mr-3 file:rounded-lg file:border-0 file:bg-ec-navy file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-ec-navy-dark"
                        disabled={busy}
                        onChange={(e) => {
                          setUploads({
                            ...uploads,
                            [d.key]: e.target.files?.[0] ?? null,
                          });
                          setUploadErrors((prev) => {
                            const next = { ...prev };
                            delete next[d.key];
                            return next;
                          });
                        }}
                      />
                      {uploads[d.key] ? (
                        <span className="text-xs font-medium text-emerald-700">
                          Attached: {uploads[d.key]?.name}
                        </span>
                      ) : null}
                      {uploadErrors[d.key] ? (
                        <span className="text-xs text-ec-danger" role="alert">
                          {uploadErrors[d.key]}
                        </span>
                      ) : null}
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="button"
                disabled={busy || !signupReady}
                onClick={onSignup}
                className="ec-btn-primary mt-10 w-full py-3 text-base shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
                aria-busy={busy}
              >
                {busy ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner size="sm" label="Sending registration" />
                    Sending registration…
                  </span>
                ) : (
                  "Submit registration for review"
                )}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={busy || !loginReady}
                onClick={onLogin}
                className="ec-btn-navy mt-8 w-full py-3 text-base shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] motion-reduce:hover:scale-100"
                aria-busy={busy}
              >
                {busy ? (
                  <span className="inline-flex items-center justify-center gap-2">
                    <Spinner
                      size="sm"
                      label="Signing in"
                      className="border-white/25 border-t-white"
                    />
                    Signing you in…
                  </span>
                ) : (
                  "Sign in to Ethio-Chain"
                )}
              </button>
              <p className="mt-5 text-center text-sm text-ec-text-muted">
                Prefer a dedicated sign-in screen?{" "}
                <Link
                  href="/login"
                  className="font-semibold text-ec-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
                >
                  Open full sign-in page
                </Link>
              </p>
              <p className="mt-3 border-t border-ec-border pt-4 text-center text-xs text-ec-text-muted">
                Google or Microsoft sign-in is not available yet. Use email and
                password.
              </p>
            </>
          )}
        </AuthCard>
      </div>

      <ForgotPasswordDialog open={forgotOpen} onClose={() => setForgotOpen(false)} />
    </AuthShell>
  );
}
