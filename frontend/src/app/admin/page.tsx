"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  LogOut,
  CheckCircle,
  AlertTriangle,
  X,
  Download,
  LayoutDashboard,
  ClipboardList,
  RefreshCw,
  Inbox,
  Shield,
  Calendar,
  ChevronRight,
  Ban,
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

const VERIFICATION_CHECKLIST = [
  "Company name matches license",
  "Expiry date is valid",
  "Document is clear and legible",
  "All required pages present",
] as const;

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

function formatRoleLabel(role: string): string {
  const map: Record<string, string> = {
    IMPORTER: "Importer",
    SELLER: "Seller",
    TRANSPORTER: "Transporter",
    CUSTOMS: "Customs",
    ESL_AGENT: "ESL agent",
    ADMIN: "Admin",
  };
  if (map[role]) return map[role];
  return role
    .split("_")
    .map((w) => w.charAt(0) + w.slice(1).toLowerCase())
    .join(" ");
}

function formatShortDate(iso?: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function userInitials(fullName: string | undefined, email: string): string {
  const n = (fullName || "").trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return n.slice(0, 2).toUpperCase();
  }
  const local = email.split("@")[0] || email;
  return local.slice(0, 2).toUpperCase();
}

function Sidebar({
  onLogout,
  isLoggedIn,
}: {
  onLogout: () => void;
  isLoggedIn: boolean;
}) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[17.5rem] flex-col border-r border-white/10 bg-gradient-to-b from-ec-navy to-ec-navy-dark text-white shadow-xl md:flex">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-6">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-ec-accent shadow-lg shadow-black/25 ring-2 ring-white/10">
            <Shield className="text-white" size={22} aria-hidden />
          </span>
          <div className="min-w-0">
            <span className="block text-sm font-bold tracking-tight">
              Ethio-Chain
            </span>
            <span className="text-xs font-medium text-slate-400">
              Admin console
            </span>
          </div>
        </div>
        <nav
          className="flex flex-1 flex-col gap-1 px-3 py-5"
          aria-label="Admin navigation"
        >
          <span className="flex cursor-default items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-400">
            <LayoutDashboard size={18} aria-hidden />
            Overview
            <span className="ml-auto rounded-md bg-white/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
              Soon
            </span>
          </span>
          <span className="flex items-center gap-3 rounded-xl bg-white/12 px-3 py-2.5 text-sm font-semibold text-white shadow-inner ring-1 ring-white/10">
            <ClipboardList size={18} aria-hidden />
            Pending approvals
          </span>
        </nav>
        <div className="border-t border-white/10 px-3 py-3">
          <Link
            href="/"
            className="group flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
          >
            <ChevronRight
              className="transition-transform group-hover:translate-x-0.5"
              size={16}
              aria-hidden
            />
            Back to marketing site
          </Link>
        </div>
        {isLoggedIn ? (
          <div className="mt-auto border-t border-white/10 p-4">
            <button
              type="button"
              onClick={onLogout}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-slate-100 transition-all duration-200 hover:border-white/20 hover:bg-ec-accent hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-ec-navy"
            >
              <LogOut size={18} aria-hidden />
              Sign out
            </button>
          </div>
        ) : null}
      </aside>

      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ec-border bg-ec-card/95 px-4 py-3 shadow-sm backdrop-blur-md md:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-ec-navy text-white shadow-sm">
            <Shield size={18} aria-hidden />
          </span>
          <div className="leading-tight">
            <span className="block text-sm font-bold text-ec-text">Admin</span>
            <span className="text-[10px] font-medium uppercase tracking-wide text-ec-text-muted">
              Approvals
            </span>
          </div>
        </div>
        {isLoggedIn ? (
          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-ec-border bg-ec-surface-raised text-ec-text-secondary transition-colors hover:bg-ec-border/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
            aria-label="Sign out"
          >
            <LogOut size={18} />
          </button>
        ) : null}
      </header>
    </>
  );
}

function DocRowSkeleton() {
  return (
    <div className="flex animate-pulse items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3">
      <div className="h-14 w-14 shrink-0 rounded-lg bg-white/10" />
      <div className="min-w-0 flex-1 space-y-2">
        <div className="h-3.5 w-2/5 rounded bg-white/15" />
        <div className="h-3 w-3/5 rounded bg-white/10" />
      </div>
    </div>
  );
}

/** Centered modal workspace: preview stage + filmstrip + side panel (not a side drawer). */
function ReviewDrawer({
  open,
  onClose,
  user,
  docs,
  docPreviews,
  docsLoading,
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
  docsLoading: boolean;
  onApprove: () => void;
  onDeny: () => void;
  onRequestInfo: () => void;
  onPreview: (doc: KYCDoc) => void;
  onDownload: (doc: KYCDoc) => void;
  actionLoading: boolean;
  actionKind: "approve" | "deny" | "info" | null;
}) {
  const [selectedDoc, setSelectedDoc] = useState<KYCDoc | null>(null);
  const [checklist, setChecklist] = useState<boolean[]>(() =>
    VERIFICATION_CHECKLIST.map(() => false)
  );
  const onPreviewRef = useRef(onPreview);
  const onCloseRef = useRef(onClose);
  onPreviewRef.current = onPreview;
  onCloseRef.current = onClose;

  const reviewUserId = user ? pendingUserId(user) : "";
  useEffect(() => {
    if (!open || !reviewUserId) return;
    setChecklist(VERIFICATION_CHECKLIST.map(() => false));
  }, [open, reviewUserId]);

  useEffect(() => {
    if (docsLoading || !docs || docs.length === 0) return;
    setSelectedDoc((prev) => {
      if (prev && docs.some((d) => d.id === prev.id)) return prev;
      return docs[0];
    });
  }, [docs, docsLoading]);

  const selectedDocId = selectedDoc?.id ?? null;
  useEffect(() => {
    if (!selectedDocId) return;
    const doc = docs.find((d) => d.id === selectedDocId);
    if (!doc) return;
    onPreviewRef.current(doc);
  }, [selectedDocId, docs]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCloseRef.current();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open || !user) return null;

  const checklistComplete = checklist.every(Boolean);

  const isImage = (contentType: string) =>
    contentType.startsWith("image/");

  const created = formatShortDate(user.created_at);
  const previewUrl =
    selectedDoc && docPreviews[selectedDoc.id] && isImage(selectedDoc.content_type)
      ? docPreviews[selectedDoc.id]
      : null;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
      <button
        type="button"
        className="ec-admin-backdrop fixed inset-0 bg-ec-navy/60 backdrop-blur-sm motion-reduce:animate-none"
        onClick={onClose}
        aria-label="Close review"
      />
      <div
        className="ec-admin-modal relative z-50 flex max-h-[min(92vh,900px)] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-ec-border bg-ec-card shadow-[0_25px_80px_-12px_rgba(15,23,42,0.35)] motion-reduce:animate-none"
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-review-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top bar */}
        <div className="relative flex shrink-0 items-center justify-between gap-3 border-b border-ec-border bg-gradient-to-r from-ec-navy via-ec-navy to-ec-navy-dark px-4 py-3 sm:px-5">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_120%_at_100%_-20%,rgba(234,88,12,0.15),transparent)]" />
          <div className="relative flex min-w-0 items-center gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/10 text-sm font-bold text-white ring-1 ring-white/20">
              {userInitials(user.full_name, user.email)}
            </span>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-ec-accent">
                KYC review
              </p>
              <h3
                id="admin-review-title"
                className="truncate text-base font-bold text-white sm:text-lg"
              >
                {user.full_name || "No name on file"}
              </h3>
              <p className="truncate text-xs text-slate-300">{user.email}</p>
            </div>
          </div>
          <div className="relative flex shrink-0 items-center gap-2">
            <span className="hidden rounded-full bg-white/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-white ring-1 ring-white/15 sm:inline">
              {formatRoleLabel(user.role)}
            </span>
            {created ? (
              <span className="hidden items-center gap-1 text-[10px] text-slate-400 sm:inline-flex">
                <Calendar size={11} aria-hidden />
                {created}
              </span>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
              aria-label="Close"
            >
              <X size={22} />
            </button>
          </div>
        </div>

        {/* Body: preview + sidebar */}
        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          {/* Preview stage */}
          <div className="flex min-h-0 flex-1 flex-col bg-gradient-to-b from-[#0f2744] to-ec-navy-dark">
            <div className="relative flex min-h-[200px] flex-1 items-center justify-center p-4 sm:min-h-[280px] sm:p-6 lg:min-h-[320px]">
              {docsLoading ? (
                <div className="flex flex-col items-center gap-3 text-slate-400">
                  <Spinner
                    size="lg"
                    label="Loading documents"
                    className="border-white/20 border-t-white/80"
                  />
                  <p className="text-sm">Loading files…</p>
                </div>
              ) : previewUrl && selectedDoc ? (
                <img
                  src={previewUrl}
                  alt={selectedDoc.original_file_name}
                  className="max-h-[min(50vh,420px)] w-full max-w-full rounded-lg object-contain shadow-2xl ring-1 ring-white/10"
                />
              ) : selectedDoc && !isImage(selectedDoc.content_type) ? (
                <div className="flex max-w-md flex-col items-center rounded-2xl border border-white/10 bg-white/5 px-8 py-10 text-center">
                  <FileText className="text-slate-400" size={40} strokeWidth={1.2} />
                  <p className="mt-3 text-sm font-medium text-white">
                    Preview not available
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    This file is not an image. Download to open it.
                  </p>
                  <button
                    type="button"
                    onClick={() => onDownload(selectedDoc)}
                    className="ec-btn-primary mt-4"
                  >
                    <Download size={16} aria-hidden />
                    Download file
                  </button>
                </div>
              ) : !docs || docs.length === 0 ? (
                <div className="text-center text-slate-400">
                  <p className="text-sm">No documents to preview</p>
                </div>
              ) : (
                <div className="text-center text-slate-400">
                  <p className="text-sm">Loading preview…</p>
                </div>
              )}
            </div>

            {/* Filmstrip */}
            {!docsLoading && docs && docs.length > 0 ? (
              <div className="border-t border-white/10 bg-black/20 px-3 py-3 sm:px-4">
                <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Select a file
                </p>
                <div className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {docs.map((d) => {
                    const active = selectedDoc?.id === d.id;
                    const thumb =
                      docPreviews[d.id] && isImage(d.content_type)
                        ? docPreviews[d.id]
                        : null;
                    return (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setSelectedDoc(d)}
                        className={`group relative shrink-0 snap-start overflow-hidden rounded-xl border-2 transition-all duration-200 ${
                          active
                            ? "border-ec-accent shadow-lg ring-2 ring-ec-accent/30"
                            : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                      >
                        <div className="flex h-16 w-20 items-center justify-center bg-white/5 sm:h-[72px] sm:w-[96px]">
                          {thumb ? (
                            <img
                              src={thumb}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <FileText className="text-slate-500" size={24} />
                          )}
                        </div>
                        <span
                          className={`absolute bottom-0 left-0 right-0 truncate px-1 py-0.5 text-[9px] font-medium ${
                            active ? "bg-ec-accent/95 text-white" : "bg-black/50 text-slate-300"
                          }`}
                        >
                          {d.doc_type.replace(/_/g, " ")}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>

          {/* Side panel */}
          <aside className="flex w-full shrink-0 flex-col border-t border-ec-border bg-ec-surface-raised lg:w-[min(100%,340px)] lg:border-l lg:border-t-0">
            <div className="max-h-[40vh] overflow-y-auto p-4 sm:max-h-none lg:flex-1 lg:overflow-y-auto">
              <h4 className="text-xs font-bold uppercase tracking-wider text-ec-text-muted">
                Verification checklist
              </h4>
              <p className="mt-1 text-[11px] leading-relaxed text-ec-text-secondary">
                Check every item before you approve. This is not saved to the
                server.
              </p>
              <ul className="mt-4 flex flex-col gap-2.5 text-sm text-ec-text-secondary">
                {VERIFICATION_CHECKLIST.map((label, idx) => (
                  <li key={label} className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={checklist[idx]}
                      onChange={() =>
                        setChecklist((prev) => {
                          const next = [...prev];
                          next[idx] = !next[idx];
                          return next;
                        })
                      }
                      disabled={actionLoading}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-ec-border text-ec-accent focus:ring-ec-accent disabled:opacity-50"
                    />
                    <span>{label}</span>
                  </li>
                ))}
              </ul>

              {selectedDoc ? (
                <div className="mt-6 rounded-xl border border-ec-border bg-ec-card p-3 text-xs">
                  <p className="font-semibold text-ec-text">Selected file</p>
                  <p className="mt-1 break-all text-ec-text-secondary">
                    {selectedDoc.original_file_name}
                  </p>
                  <p className="mt-2 text-ec-text-muted">
                    {(selectedDoc.size_bytes / 1024).toFixed(1)} KB
                  </p>
                  <button
                    type="button"
                    onClick={() => onDownload(selectedDoc)}
                    className="ec-btn-ghost mt-3 w-full justify-center border border-ec-border bg-ec-surface-raised text-xs"
                  >
                    <Download size={14} aria-hidden />
                    Download
                  </button>
                </div>
              ) : null}
            </div>
          </aside>
        </div>

        {/* Actions */}
        <div className="shrink-0 border-t border-ec-border bg-ec-card p-3 shadow-[0_-12px_32px_-8px_rgba(15,23,42,0.12)] sm:p-4">
          <div className="mx-auto grid max-w-3xl grid-cols-1 gap-2 sm:grid-cols-3 sm:gap-3">
            {!checklistComplete ? (
              <p
                className="col-span-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-center text-xs font-medium text-amber-950 sm:col-span-3"
                role="status"
              >
                Complete the verification checklist above to enable Approve.
              </p>
            ) : null}
            <button
              type="button"
              onClick={onApprove}
              disabled={actionLoading || !checklistComplete}
              title={
                checklistComplete
                  ? undefined
                  : "Check every item in the verification list before approving"
              }
              className="flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-emerald-700 hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 motion-reduce:active:scale-100"
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
              className="flex items-center justify-center gap-2 rounded-xl bg-ec-accent py-3.5 text-sm font-bold text-white shadow-md transition-all duration-200 hover:bg-ec-accent-hover hover:shadow-lg active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2 motion-reduce:active:scale-100"
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
              className="flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-red-50/80 py-3.5 text-sm font-bold text-red-800 shadow-sm transition-all duration-200 hover:bg-red-100 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 motion-reduce:active:scale-100"
            >
              {actionLoading && actionKind === "deny" ? (
                <Spinner
                  size="sm"
                  label="Working"
                  className="border-red-200 border-t-red-600"
                />
              ) : (
                <Ban size={18} aria-hidden />
              )}
              Deny
            </button>
          </div>
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
  const [docsLoading, setDocsLoading] = useState(false);
  const [queueRefreshing, setQueueRefreshing] = useState(false);
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
    setDocs([]);
    setDocsLoading(true);
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
    } finally {
      setDocsLoading(false);
    }
  }

  async function refreshQueue() {
    const t = getToken();
    if (!t) return;
    setQueueRefreshing(true);
    try {
      await refreshPending(t);
    } finally {
      setQueueRefreshing(false);
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
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-ec-surface to-ec-surface-raised px-4">
        <div className="flex flex-col items-center rounded-2xl border border-ec-border bg-ec-card px-10 py-12 shadow-lg">
          <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-ec-navy text-white shadow-md">
            <Shield size={24} aria-hidden />
          </span>
          <Spinner size="lg" label="Loading admin console" />
          <p className="mt-4 text-sm font-medium text-ec-text-secondary">
            Loading approvals…
          </p>
        </div>
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
    <div className="min-h-screen bg-gradient-to-b from-ec-surface via-ec-surface to-ec-surface-raised">
      <Sidebar onLogout={logout} isLoggedIn={isLoggedIn} />
      <main className="mx-auto flex-1 max-w-6xl px-4 pb-16 pt-6 md:ml-64 md:px-10 md:pt-10">
        <div className="mb-8 flex flex-col gap-4 border-b border-ec-border/80 pb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-ec-accent">
              Admin
            </p>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-ec-text md:text-3xl">
              Account approvals
            </h1>
            <p className="mt-2 max-w-xl text-sm leading-relaxed text-ec-text-secondary">
              Review KYC uploads and activate accounts for the Ethio-Chain
              platform. Importers and sellers register first; partners follow the
              same flow.
            </p>
          </div>
          <Link
            href="/role-selection"
            className="inline-flex items-center gap-1 self-start rounded-xl border border-ec-border bg-ec-card px-4 py-2.5 text-sm font-semibold text-ec-text shadow-sm transition-all duration-200 hover:border-ec-accent/40 hover:text-ec-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent sm:self-auto"
          >
            Roles and registration
            <ChevronRight size={16} aria-hidden />
          </Link>
        </div>

        {!isLoggedIn ? (
          <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-ec-border bg-ec-card shadow-lg">
            <div className="h-1.5 bg-gradient-to-r from-ec-navy via-ec-accent to-ec-navy" />
            <div className="p-6 sm:p-8">
              <div className="mb-6 flex items-start gap-4">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-ec-navy text-white shadow-md">
                  <Shield size={24} aria-hidden />
                </span>
                <div>
                  <h2 className="text-xl font-bold text-ec-text">
                    Staff sign in
                  </h2>
                  <p className="mt-1 text-sm text-ec-text-secondary">
                    This area is for platform administrators only. Buyers and
                    sellers should use the main{" "}
                    <Link
                      href="/login"
                      className="font-semibold text-ec-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent rounded"
                    >
                      sign in page
                    </Link>
                    .
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-4">
                <label className="flex flex-col gap-1.5">
                  <span className="ec-label">Work email</span>
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
              </div>
              <button
                type="button"
                className="ec-btn-navy mt-6 w-full py-3 text-base shadow-md transition-transform duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:hover:scale-100 sm:w-auto sm:px-10"
                onClick={adminLogin}
                disabled={adminLoginBusy || !email.trim() || !password}
              >
                {adminLoginBusy ? (
                  <span className="inline-flex items-center gap-2">
                    <Spinner
                      size="sm"
                      label="Signing in"
                      className="border-white/30 border-t-white"
                    />
                    Signing in…
                  </span>
                ) : (
                  "Sign in to console"
                )}
              </button>
            </div>
          </div>
        ) : null}

        {isLoggedIn ? (
          <div className="overflow-hidden rounded-2xl border border-ec-border bg-ec-card shadow-md">
            <div className="flex flex-col gap-4 border-b border-ec-border bg-ec-surface-raised/80 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <div>
                <h2 className="text-lg font-bold text-ec-text">
                  Queue
                </h2>
                <p className="mt-0.5 text-sm text-ec-text-secondary">
                  <span className="font-semibold tabular-nums text-ec-text">
                    {pending?.length ?? 0}
                  </span>{" "}
                  registration
                  {pending?.length === 1 ? "" : "s"} waiting for review
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void refreshQueue()}
                  disabled={queueRefreshing}
                  className="inline-flex items-center gap-2 rounded-xl border border-ec-border bg-ec-card px-4 py-2.5 text-sm font-semibold text-ec-text shadow-sm transition-all duration-200 hover:border-ec-accent/40 hover:bg-ec-surface-raised disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <RefreshCw
                    size={16}
                    className={
                      queueRefreshing ? "animate-spin" : ""
                    }
                    aria-hidden
                  />
                  {queueRefreshing ? "Refreshing…" : "Refresh queue"}
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-3 p-4 sm:p-5">
              {pending.map((u) => (
                <div
                  key={pendingUserId(u)}
                  className="group flex flex-col gap-4 rounded-2xl border border-ec-border bg-ec-surface-raised px-4 py-4 transition-all duration-200 hover:border-ec-accent/40 hover:shadow-md sm:flex-row sm:items-center sm:justify-between sm:px-5"
                >
                  <div className="flex min-w-0 items-start gap-4">
                    <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ec-navy text-sm font-bold text-white shadow-sm ring-2 ring-white">
                      {userInitials(u.full_name, u.email)}
                    </span>
                    <div className="min-w-0">
                      <div className="truncate font-semibold text-ec-text">
                        {u.full_name || u.email}
                      </div>
                      <div className="mt-1 text-xs text-ec-text-secondary">
                        {u.email}
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <span className="inline-flex rounded-full bg-ec-card px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ec-navy ring-1 ring-ec-border">
                          {formatRoleLabel(u.role)}
                        </span>
                        {formatShortDate(u.created_at) ? (
                          <span className="inline-flex items-center gap-1 text-[11px] text-ec-text-muted">
                            <Calendar size={12} aria-hidden />
                            {formatShortDate(u.created_at)}
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ec-btn-primary shrink-0 rounded-xl px-6 py-2.5 shadow-sm transition-transform duration-200 hover:scale-[1.02] active:scale-[0.98] motion-reduce:hover:scale-100"
                    onClick={() => openReview(u)}
                  >
                    Review
                  </button>
                </div>
              ))}
              {!pending || pending.length === 0 ? (
                <div className="flex flex-col items-center rounded-2xl border border-dashed border-ec-border bg-ec-surface/50 py-16 text-center">
                  <span className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-ec-navy/5 text-ec-navy">
                    <Inbox size={32} strokeWidth={1.25} aria-hidden />
                  </span>
                  <p className="mt-4 text-base font-semibold text-ec-text">
                    All caught up
                  </p>
                  <p className="mt-2 max-w-sm text-sm text-ec-text-secondary">
                    No registrations are waiting. New signups will appear here
                    after they submit. Refresh if you expected someone already.
                  </p>
                </div>
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
          setDocsLoading(false);
          Object.values(docPreviews).forEach(URL.revokeObjectURL);
          setDocPreviews({});
        }}
        user={selectedUser}
        docs={docs}
        docPreviews={docPreviews}
        docsLoading={docsLoading}
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
