"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import {
  User,
  FileText,
  LogOut,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Eye,
  Download,
  LayoutDashboard,
  ClipboardList,
} from "lucide-react";
import { API_BASE, apiFetch } from "@/lib/api";
import { type LoginResponse } from "@/lib/auth-redirect";
import {
  clearStoredToken,
  getStoredToken,
  setStoredToken,
} from "@/lib/auth-storage";
import { decodeJwtPayload, isTokenExpired } from "@/lib/jwt";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastProvider";

type PendingUser = {
  id: string;
  email: string;
  role: string;
  status: string;
  created_at?: string;
  full_name?: string;
  /** Legacy API shape before json tags on domain.User */
  ID?: string;
};

/** Pending list must use user id for /users/:id/docs; API sends `id` (Go json tags). */
function pendingUserId(u: PendingUser): string {
  return u.id || u.ID || "";
}

type KYCDoc = {
  id: string;
  user_id: string;
  doc_type: string;
  original_file_name: string;
  content_type: string;
  size_bytes: number;
  storage_key: string;
  uploaded_at: string;
};

function Sidebar({
  active,
  onLogout,
  isLoggedIn,
}: {
  active: string;
  onLogout: () => void;
  isLoggedIn: boolean;
}) {
  const nav = (
    <>
      <span
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
          active === "dashboard"
            ? "bg-white/10 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <LayoutDashboard size={18} aria-hidden />
        Dashboard
      </span>
      <span
        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold ${
          active === "admissions"
            ? "bg-white/10 text-white"
            : "text-slate-300 hover:bg-white/5 hover:text-white"
        }`}
      >
        <ClipboardList size={18} aria-hidden />
        Pending approvals
      </span>
    </>
  );

  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-white/10 bg-ec-navy text-white shadow-lg md:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-ec-accent/90">
            <User className="text-white" size={22} aria-hidden />
          </span>
          <div>
            <span className="block text-sm font-bold tracking-wide">
              Admin console
            </span>
            <span className="text-xs text-slate-400">KYC and approvals</span>
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1 px-3 py-4">{nav}</nav>
        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
          >
            Marketing site
          </Link>
        </div>
        {isLoggedIn ? (
          <div className="mt-auto border-t border-white/10 p-4">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-white/10 py-2.5 text-sm font-semibold text-slate-200 transition-colors hover:bg-ec-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ec-navy"
            >
              <LogOut size={18} aria-hidden />
              Log out
            </button>
          </div>
        ) : null}
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ec-border bg-ec-card px-4 py-3 shadow-sm md:hidden">
        <span className="text-sm font-bold text-ec-text">Admin</span>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className="ec-btn-ghost text-ec-text-secondary"
          >
            <LogOut size={18} />
          </button>
        ) : null}
      </header>
    </>
  );
}

function ReviewDrawer({
  open,
  onClose,
  user,
  docs,
  docPreviews,
  onApprove,
  onDeny,
  onRequestInfo,
  onPreview,
  onDownload,
  actionLoading,
  actionKind,
}: {
  open: boolean;
  onClose: () => void;
  user: PendingUser | null;
  docs: KYCDoc[];
  docPreviews: Record<string, string>;
  onApprove: () => void;
  onDeny: () => void;
  onRequestInfo: () => void;
  onPreview: (doc: KYCDoc) => void;
  onDownload: (doc: KYCDoc) => void;
  actionLoading: boolean;
  actionKind: "approve" | "deny" | "info" | null;
}) {
  const [selectedDoc, setSelectedDoc] = useState<KYCDoc | null>(null);

  if (!open || !user) return null;

  const isImage = (contentType: string) =>
    contentType.startsWith("image/");

  return (
    <div className="fixed inset-0 z-40 flex">
      <div
        className="fixed inset-0 bg-ec-text/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div className="relative z-50 ml-auto flex h-full w-full max-w-2xl flex-col bg-ec-card shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-ec-border px-5 py-4 md:px-6">
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-ec-text md:text-xl">
              Review uploaded files
            </h3>
            <p className="mt-1 text-sm text-ec-text-secondary">
              {user.full_name || user.email}{" "}
              <span className="text-ec-text-muted">·</span> {user.role}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-ec-text-muted transition-colors hover:bg-ec-surface hover:text-ec-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
            aria-label="Close"
          >
            <XCircle size={22} />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5 md:p-6">
          {selectedDoc &&
            docPreviews[selectedDoc.id] &&
            isImage(selectedDoc.content_type) && (
              <div className="flex min-h-[240px] items-center justify-center rounded-xl bg-ec-navy p-4 md:min-h-[300px]">
                <img
                  src={docPreviews[selectedDoc.id]}
                  alt={selectedDoc.original_file_name}
                  className="max-h-[400px] max-w-full rounded-lg object-contain"
                />
              </div>
            )}

          <div className="ec-surface-panel">
            <div className="mb-3 text-sm font-bold text-ec-text">
              Uploaded documents ({docs.length})
            </div>
            {docs.length === 0 ? (
              <p className="text-sm text-ec-text-secondary">
                No documents on file for this user.
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {docs.map((d) => (
                  <div
                    key={d.id}
                    role="button"
                    tabIndex={0}
                    className={`flex cursor-pointer items-center justify-between gap-3 rounded-xl border bg-ec-card p-3 transition-all ${
                      selectedDoc?.id === d.id
                        ? "border-ec-accent ring-2 ring-ec-accent/25"
                        : "border-ec-border hover:border-ec-border-strong"
                    }`}
                    onClick={() => {
                      setSelectedDoc(d);
                      onPreview(d);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        setSelectedDoc(d);
                        onPreview(d);
                      }
                    }}
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      {docPreviews[d.id] && isImage(d.content_type) ? (
                        <img
                          src={docPreviews[d.id]}
                          alt=""
                          className="h-12 w-12 rounded-lg border border-ec-border object-cover"
                        />
                      ) : (
                        <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-ec-border bg-ec-surface-raised">
                          <FileText className="text-ec-text-muted" size={20} />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold capitalize text-ec-text">
                          {d.doc_type.replace(/_/g, " ")}
                        </div>
                        <div className="truncate text-xs text-ec-text-secondary">
                          {d.original_file_name}
                        </div>
                        <div className="text-xs text-ec-text-muted">
                          {(d.size_bytes / 1024).toFixed(1)} KB
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        className="rounded-lg p-2 text-ec-text-muted transition-colors hover:bg-ec-surface hover:text-ec-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDoc(d);
                          onPreview(d);
                        }}
                        title="Preview"
                      >
                        <Eye size={18} />
                      </button>
                      <button
                        type="button"
                        className="rounded-lg p-2 text-ec-text-muted transition-colors hover:bg-ec-surface hover:text-ec-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(d);
                        }}
                        title="Download"
                      >
                        <Download size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="ec-surface-panel">
            <h4 className="mb-3 text-sm font-semibold text-ec-text">
              Verification checklist
            </h4>
            <ul className="flex flex-col gap-2.5 text-sm text-ec-text-secondary">
              <li className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                />
                <span>Company name matches license</span>
              </li>
              <li className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                />
                <span>Expiry date is valid</span>
              </li>
              <li className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                />
                <span>Document is clear and legible</span>
              </li>
              <li className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-0.5 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                />
                <span>All required pages present</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-col gap-2 border-t border-ec-border bg-ec-surface-raised p-4 sm:flex-row sm:gap-3">
          <button
            type="button"
            onClick={onApprove}
            disabled={actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-emerald-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:active:scale-100"
          >
            {actionLoading && actionKind === "approve" ? (
              <Spinner
                size="sm"
                label="Working"
                className="border-white/30 border-t-white"
              />
            ) : (
              <CheckCircle size={18} aria-hidden />
            )}
            Approve
          </button>
          <button
            type="button"
            onClick={onRequestInfo}
            disabled={actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-ec-accent py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-ec-accent-hover hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 motion-reduce:active:scale-100"
          >
            {actionLoading && actionKind === "info" ? (
              <Spinner
                size="sm"
                label="Working"
                className="border-white/30 border-t-white"
              />
            ) : (
              <AlertTriangle size={18} aria-hidden />
            )}
            Request info
          </button>
          <button
            type="button"
            onClick={onDeny}
            disabled={actionLoading}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-600 py-3 text-sm font-bold text-white shadow-sm transition-all duration-200 hover:bg-red-700 hover:shadow-md active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 sm:rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 motion-reduce:active:scale-100"
          >
            {actionLoading && actionKind === "deny" ? (
              <Spinner
                size="sm"
                label="Working"
                className="border-white/30 border-t-white"
              />
            ) : (
              <XCircle size={18} aria-hidden />
            )}
            Deny
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [sessionChecked, setSessionChecked] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [token, setToken] = useState<string>("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pending, setPending] = useState<PendingUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<PendingUser | null>(null);
  const [docs, setDocs] = useState<KYCDoc[]>([]);
  const [docPreviews, setDocPreviews] = useState<Record<string, string>>({});
  const [actionLoading, setActionLoading] = useState(false);
  const [actionKind, setActionKind] = useState<
    "approve" | "deny" | "info" | null
  >(null);
  const [pendingConfirm, setPendingConfirm] = useState<
    "approve" | "deny" | "info" | null
  >(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [adminLoginBusy, setAdminLoginBusy] = useState(false);

  const getToken = useCallback(() => {
    if (token) return token;
    if (typeof window !== "undefined") {
      return getStoredToken() || "";
    }
    return "";
  }, [token]);

  const refreshPending = useCallback(async (t: string) => {
    try {
      const res = await apiFetch<{ items: PendingUser[] }>(
        "/api/v1/admin/pending-approvals?limit=200",
        { token: t }
      );
      setPending(res.items ?? []);
      setIsLoggedIn(true);
    } catch {
      setIsLoggedIn(false);
      setPending([]);
    }
  }, []);

  async function adminLogin() {
    if (!email.trim() || !password) return;
    setAdminLoginBusy(true);
    try {
      const res = await apiFetch<LoginResponse>("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      setStoredToken(res.token, true);
      setToken(res.token);
      if (res.user.role !== "ADMIN") {
        toast("This account is not admin. Redirecting to the portal.", "info");
        router.replace("/dashboard");
        return;
      }
      setIsLoggedIn(true);
      await refreshPending(res.token);
      toast("Signed in to the admin console.", "success");
    } catch (e: unknown) {
      const msg =
        errorMessage(e) ?? "Could not sign in. Check email and password.";
      toast(msg, "error");
      setIsLoggedIn(false);
    } finally {
      setAdminLoginBusy(false);
    }
  }

  function logout() {
    clearStoredToken();
    setToken("");
    setIsLoggedIn(false);
    setPending([]);
  }

  async function openReview(u: PendingUser) {
    setSelectedUser(u);
    setDrawerOpen(true);
    setDocPreviews({});
    const t = getToken();
    try {
      const res = await apiFetch<{ items: KYCDoc[] }>(
        `/api/v1/admin/users/${pendingUserId(u)}/docs`,
        { token: t }
      );
      const docList = res.items ?? [];
      setDocs(docList);
      
      for (const doc of docList) {
        if (doc.content_type.startsWith("image/")) {
          loadDocPreview(doc, t);
        }
      }
    } catch {
      setDocs([]);
    }
  }

  async function loadDocPreview(doc: KYCDoc, t: string) {
    try {
      const url = `${API_BASE}/api/v1/admin/docs/${doc.id}/download`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        setDocPreviews((prev) => ({ ...prev, [doc.id]: blobUrl }));
      }
    } catch {
      // Ignore preview errors
    }
  }

  async function approveSelected() {
    if (!selectedUser) return;
    setActionKind("approve");
    setActionLoading(true);
    const t = getToken();
    try {
      await apiFetch(`/api/v1/admin/users/${pendingUserId(selectedUser)}/approve`, {
        method: "POST",
        token: t,
      });
      setDrawerOpen(false);
      setSelectedUser(null);
      setDocs([]);
      setDocPreviews({});
      await refreshPending(t);
      toast("Account approved. They can sign in now.", "success");
    } catch (e: unknown) {
      const msg = errorMessage(e) ?? "Could not approve this account.";
      toast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionKind(null);
    }
  }

  async function denySelected() {
    if (!selectedUser) return;
    setActionKind("deny");
    setActionLoading(true);
    const t = getToken();
    try {
      await apiFetch(`/api/v1/admin/users/${pendingUserId(selectedUser)}/deny`, {
        method: "POST",
        token: t,
      });
      setDrawerOpen(false);
      setSelectedUser(null);
      setDocs([]);
      setDocPreviews({});
      await refreshPending(t);
      toast("Registration denied.", "success");
    } catch (e: unknown) {
      const msg = errorMessage(e) ?? "Could not deny this account.";
      toast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionKind(null);
    }
  }

  async function requestInfoSelected() {
    if (!selectedUser) return;
    setActionKind("info");
    setActionLoading(true);
    const t = getToken();
    try {
      await apiFetch(`/api/v1/admin/users/${pendingUserId(selectedUser)}/request-info`, {
        method: "POST",
        token: t,
      });
      toast("We asked the user for more information.", "success");
    } catch (e: unknown) {
      const msg = errorMessage(e) ?? "Could not send the information request.";
      toast(msg, "error");
    } finally {
      setActionLoading(false);
      setActionKind(null);
    }
  }

  function runConfirmedAction() {
    const kind = pendingConfirm;
    if (!kind || !selectedUser) return;
    setPendingConfirm(null);
    void (async () => {
      if (kind === "approve") await approveSelected();
      else if (kind === "deny") await denySelected();
      else await requestInfoSelected();
    })();
  }

  function previewDoc(doc: KYCDoc) {
    const t = getToken();
    if (!docPreviews[doc.id] && doc.content_type.startsWith("image/")) {
      loadDocPreview(doc, t);
    }
  }

  async function downloadDoc(d: KYCDoc) {
    const t = getToken();
    const url = `${API_BASE}/api/v1/admin/docs/${d.id}/download`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${t}` },
    });
    if (!res.ok) {
      toast(
        `We could not download that file (error ${res.status}). Try again.`,
        "error"
      );
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = d.original_file_name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  }

  useEffect(() => {
    const t = getStoredToken();
    if (!t) {
      setSessionChecked(true);
      return;
    }
    if (isTokenExpired(t)) {
      clearStoredToken();
      setSessionChecked(true);
      return;
    }
    const p = decodeJwtPayload(t);
    if (p?.role && p.role !== "ADMIN") {
      router.replace("/dashboard");
      return;
    }
    if (p?.role === "ADMIN") {
      setToken(t);
      void refreshPending(t).finally(() => setSessionChecked(true));
      return;
    }
    clearStoredToken();
    setSessionChecked(true);
  }, [router, refreshPending]);

  if (!sessionChecked) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-ec-surface px-4">
        <Spinner size="lg" label="Loading approvals" />
        <p className="mt-4 text-sm text-ec-text-muted">Loading approvals…</p>
      </div>
    );
  }

  const confirmWho =
    selectedUser?.full_name || selectedUser?.email || "this applicant";
  const confirmCopy =
    pendingConfirm === "approve"
      ? {
          title: "Approve this account?",
          description: `This will activate the account for ${confirmWho}. They can then sign in to Ethio-Chain.`,
          confirmLabel: "Approve",
          variant: "default" as const,
        }
      : pendingConfirm === "deny"
        ? {
            title: "Deny this registration?",
            description:
              "They will not be able to sign in until they submit a new registration.",
            confirmLabel: "Deny registration",
            variant: "danger" as const,
          }
        : pendingConfirm === "info"
          ? {
              title: "Request more information?",
              description:
                "We will notify the user to provide clearer documents or details before you approve.",
              confirmLabel: "Send request",
              variant: "warning" as const,
            }
          : null;

  return (
    <div className="min-h-screen bg-ec-surface">
      <Sidebar active="dashboard" onLogout={logout} isLoggedIn={isLoggedIn} />
      <main className="flex-1 px-4 pb-12 pt-6 md:ml-64 md:px-10 md:pt-10">
        <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-ec-text md:text-3xl">
              Account approvals
            </h1>
            <p className="mt-1 text-sm text-ec-text-secondary">
              Importers, sellers, and partners register here first. You review
              files and turn accounts on.
            </p>
          </div>
          <Link
            href="/role-selection"
            className="text-sm font-medium text-ec-accent hover:text-ec-accent-hover focus-visible:outline-none focus-visible:underline"
          >
            Roles &amp; registration
          </Link>
        </div>

        {!isLoggedIn ? (
          <div className="ec-card max-w-2xl">
            <h2 className="text-lg font-bold text-ec-text">Admin sign in</h2>
            <p className="mt-1 text-sm text-ec-text-secondary">
              Staff only. Buyers and sellers should use the main sign-in page.
            </p>
            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <label className="flex flex-col gap-1.5">
                <span className="ec-label">Email</span>
                <input
                  className="ec-input"
                  placeholder="admin@example.com"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adminLogin()}
                />
              </label>
              <label className="flex flex-col gap-1.5">
                <span className="ec-label">Password</span>
                <input
                  className="ec-input"
                  placeholder="••••••••"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adminLogin()}
                />
              </label>
              <button
                type="button"
                className="ec-btn-navy flex h-[42px] shrink-0 items-center justify-center gap-2 px-6 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={adminLogin}
                disabled={
                  adminLoginBusy || !email.trim() || !password
                }
              >
                {adminLoginBusy ? (
                  <Spinner
                    size="sm"
                    label="Signing in"
                    className="border-white/30 border-t-white"
                  />
                ) : null}
                Sign in
              </button>
            </div>
          </div>
        ) : null}

        {isLoggedIn ? (
          <div className="ec-card max-w-4xl">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-bold text-ec-text">
                Waiting for review
                <span className="ml-2 text-ec-text-muted">({pending.length})</span>
              </h2>
              <button
                type="button"
                onClick={() => refreshPending(getToken())}
                className="ec-btn-ghost self-start sm:self-auto"
              >
                Refresh queue
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {pending.map((u) => (
                <div
                  key={pendingUserId(u)}
                  className="flex flex-col gap-3 rounded-2xl border border-ec-border bg-ec-surface-raised px-4 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="truncate font-semibold text-ec-text">
                      {u.full_name || u.email}
                    </div>
                    <div className="truncate text-xs text-ec-text-secondary">
                      {u.role} · {u.email}
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ec-btn-primary shrink-0 rounded-full px-5"
                    onClick={() => openReview(u)}
                  >
                    Review files
                  </button>
                </div>
              ))}
              {pending.length === 0 ? (
                <p className="py-10 text-center text-sm text-ec-text-secondary">
                  No one is waiting right now. New registrations will show up
                  here. Use Refresh queue after a few minutes if you expected
                  someone.
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </main>
      {confirmCopy ? (
        <ConfirmDialog
          open={pendingConfirm !== null && selectedUser !== null}
          title={confirmCopy.title}
          description={confirmCopy.description}
          confirmLabel={confirmCopy.confirmLabel}
          variant={confirmCopy.variant}
          onConfirm={runConfirmedAction}
          onCancel={() => setPendingConfirm(null)}
        />
      ) : null}
      <ReviewDrawer
        open={drawerOpen}
        onClose={() => {
          setPendingConfirm(null);
          setDrawerOpen(false);
          setSelectedUser(null);
          setDocs([]);
          Object.values(docPreviews).forEach(URL.revokeObjectURL);
          setDocPreviews({});
        }}
        user={selectedUser}
        docs={docs}
        docPreviews={docPreviews}
        onApprove={() => setPendingConfirm("approve")}
        onDeny={() => setPendingConfirm("deny")}
        onRequestInfo={() => setPendingConfirm("info")}
        onPreview={previewDoc}
        onDownload={downloadDoc}
        actionLoading={actionLoading}
        actionKind={actionKind}
      />
    </div>
  );
}

function errorMessage(e: unknown): string | null {
  if (!e) return null;
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return null;
}
