"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col bg-ec-surface">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-50 text-red-700 ring-1 ring-red-200">
          <AlertTriangle size={28} aria-hidden />
        </span>
        <h1 className="mt-6 text-center text-2xl font-bold text-ec-text md:text-3xl">
          Something went wrong
        </h1>
        <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-ec-text-secondary">
          Something broke on this screen. Try again, go home, or sign in if you
          were partway through a task.
        </p>
        {error.message ? (
          <p className="mt-4 max-w-lg rounded-lg border border-ec-border bg-ec-surface-raised px-4 py-3 text-left font-mono text-xs text-ec-text-muted break-all">
            {error.message}
          </p>
        ) : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => reset()}
            className="ec-btn-primary inline-flex items-center justify-center gap-2 px-6"
          >
            <RefreshCw size={18} aria-hidden />
            Try again
          </button>
          <Link
            href="/"
            className="ec-btn-ghost inline-flex items-center justify-center gap-2 border border-ec-border px-6"
          >
            <Home size={18} aria-hidden />
            Home
          </Link>
        </div>
      </main>
    </div>
  );
}
