"use client";
import React from "react";
import { useParams, useRouter } from "next/navigation";
import ShipmentDetailClient from "@/components/seller/ShipmentDetailClient";
import { PortalHeader } from "@/components/layout/PortalHeader";
import { clearStoredToken } from "@/lib/auth-storage";

export default function Page() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  function signOut() {
    clearStoredToken();
    router.push("/");
  }

  return (
    <div className="flex min-h-screen flex-col bg-ec-surface">
      <PortalHeader
        title="Seller Portal"
        subtitle={`Signed in as Seller`}
        actions={
          <>
            <button
              type="button"
              onClick={signOut}
              className="inline-flex items-center gap-2 rounded-lg border border-ec-border bg-ec-card px-3 py-2 text-sm font-semibold text-ec-text shadow-sm transition-colors hover:bg-ec-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
            >
              Sign out
            </button>
          </>
        }
      />
      <main className="mx-auto w-full max-w-6xl px-4 py-8 md:px-8">
        {!id ? (
          <div className="p-6">Shipment ID missing</div>
        ) : (
          <ShipmentDetailClient id={id} />
        )}
      </main>
    </div>
  );
}
