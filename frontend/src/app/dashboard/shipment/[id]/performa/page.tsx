"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import DocumentUpload from "@/components/seller/DocumentUpload";
import { getStoredToken } from "@/lib/auth-storage";
import { API_BASE } from "@/lib/api";

export default function PerformaUploadPage() {
  const params = useParams();
  const id = params?.id as string | undefined;
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleUpload(fd: FormData) {
    if (!id) return;
    setBusy(true);
    setMessage(null);
    try {
      const token = getStoredToken();
      const res = await fetch(
        `${API_BASE}/api/v1/seller/shipments/${id}/documents`,
        {
          method: "POST",
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
          body: fd,
        },
      );
      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || "upload failed");
      }
      setMessage("Upload successful");
      // small delay then navigate back to dashboard
      setTimeout(() => router.push("/dashboard"), 800);
    } catch (err: unknown) {
      console.error("performa upload", err);
      const errorMessage = err instanceof Error ? err.message : String(err);
      setMessage(errorMessage);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto py-12 px-4">
      {!id ? (
        <div className="text-center">
          <p className="text-ec-text-muted">Loading shipment info...</p>
        </div>
      ) : (
        <>
          <div className="mb-8 text-center text-ec-text">
            <h1 className="text-2xl font-bold">Upload Seller Documents</h1>
            <p className="text-ec-text-muted mt-2">
              Shipment ID: <span className="font-mono">{id}</span>
            </p>
          </div>

          <div className="ec-card p-6">
            <div className="mb-6 rounded-lg bg-ec-surface-raised p-4 border border-ec-border">
              <p className="text-sm text-ec-text-secondary leading-relaxed">
                Please upload the <strong>Packing List</strong> for this shipment. Once
                uploaded, the shipment will move to the tracking section.
              </p>
            </div>

            <DocumentUpload onUpload={handleUpload} />

            {busy && (
              <div className="mt-4 flex items-center justify-center gap-2 text-ec-text-muted">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-ec-accent border-t-transparent"></div>
                <span className="text-sm">Uploading document...</span>
              </div>
            )}

            {message && (
              <div
                className={`mt-4 rounded-md p-3 text-sm text-center ${message.includes("successful") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
              >
                {message}
              </div>
            )}
          </div>
        </>
      )}

      <button
        onClick={() => router.back()}
        className="mt-6 w-full text-sm text-ec-text-muted hover:text-ec-text transition-colors"
      >
        Cancel and go back
      </button>
    </div>
  );
}
