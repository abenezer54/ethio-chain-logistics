"use client";

import {
  createContext,
  useCallback,
  useContext,
  useId,
  useState,
  type ReactNode,
  type ReactElement,
} from "react";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastContextValue = {
  toast: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}

const toneClass: Record<ToastTone, string> = {
  success:
    "border-emerald-200 bg-emerald-50 text-emerald-950 shadow-emerald-900/10",
  error: "border-red-200 bg-red-50 text-red-950 shadow-red-900/10",
  info: "border-ec-border bg-ec-card text-ec-text shadow-ec-text/5",
  warning:
    "border-amber-200 bg-amber-50 text-amber-950 shadow-amber-900/10",
};

const toneIcon: Record<ToastTone, ReactElement> = {
  success: (
    <CheckCircle2
      className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600"
      aria-hidden
    />
  ),
  error: (
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-600" aria-hidden />
  ),
  info: <Info className="mt-0.5 h-5 w-5 shrink-0 text-ec-accent" aria-hidden />,
  warning: (
    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
  ),
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const regionId = useId();

  const toast = useCallback((message: string, tone: ToastTone = "info") => {
    const id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;
    setItems((prev) => [...prev, { id, message, tone }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, 5200);
  }, []);

  function dismiss(id: string) {
    setItems((prev) => prev.filter((t) => t.id !== id));
  }

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div
        id={regionId}
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed bottom-0 right-0 z-[200] flex max-h-[min(40vh,360px)] w-full max-w-md flex-col-reverse gap-2 overflow-hidden p-4 sm:bottom-4 sm:right-4"
      >
        {items.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`pointer-events-auto ec-toast-enter flex items-start gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg transition-all duration-200 motion-reduce:transition-none ${toneClass[t.tone]}`}
          >
            {toneIcon[t.tone]}
            <p className="min-w-0 flex-1 leading-snug">{t.message}</p>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              className="shrink-0 rounded-lg p-1 text-current opacity-70 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent focus-visible:ring-offset-2"
              aria-label="Dismiss notification"
            >
              <X size={16} aria-hidden />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
