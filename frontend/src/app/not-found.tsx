import Link from "next/link";
import { Home } from "lucide-react";
import { BackButton } from "@/components/layout/BackButton";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col bg-ec-surface">
      <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
        <p className="text-sm font-semibold uppercase tracking-wider text-ec-text-muted">
          404
        </p>
        <h1 className="mt-2 text-center text-2xl font-bold text-ec-text md:text-3xl">
          Page not found
        </h1>
        <p className="mt-3 max-w-md text-center text-sm leading-relaxed text-ec-text-secondary">
          That page is not here. Check the link, go back, or open the home page
          and start fresh.
        </p>
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/"
            className="ec-btn-primary inline-flex items-center justify-center gap-2 px-6"
          >
            <Home size={18} aria-hidden />
            Home
          </Link>
          <Link
            href="/login"
            className="ec-btn-ghost inline-flex items-center justify-center gap-2 border border-ec-border px-6"
          >
            Sign in
          </Link>
        </div>
        <div className="mt-6">
          <BackButton />
        </div>
      </main>
    </div>
  );
}
