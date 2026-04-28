"use client";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api";
import { getStoredToken } from "@/lib/auth-storage";
import DocumentViewer from "@/components/seller/DocumentViewer";
import { useToast } from "@/components/ui/ToastProvider";

type Doc = {
  id: string;
  shipment_id: string;
  original_file_name: string;
  content_type?: string;
  doc_type?: string;
};

type ShipmentSummary = {
  id: string;
  origin_port?: string;
  destination_port?: string;
  cargo_type?: string;
  weight_kg?: string;
  volume_cbm?: string;
};

export default function ShipmentDetailClient({ id }: { id: string }) {
  const router = useRouter();
  const [docs, setDocs] = useState<Doc[]>([]);
  const [shipment, setShipment] = useState<ShipmentSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [checks, setChecks] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const token = getStoredToken();
      const [docsJson, shipmentsJson] = await Promise.all([
        apiFetch<{ items: Doc[] }>(`/api/v1/seller/shipments/${id}/documents`, {
          token: token ?? undefined,
        }),
        apiFetch<{ items: ShipmentSummary[] }>("/api/v1/seller/all?limit=500", {
          token: token ?? undefined,
        }),
      ]);
      const items = Array.isArray(docsJson.items) ? docsJson.items : [];
      setDocs(items);
      const shipmentList = Array.isArray(shipmentsJson.items)
        ? shipmentsJson.items
        : [];
      setShipment(shipmentList.find((s) => s.id === id) ?? null);
      setChecks({
        bol: items.some(
          (d) => (d.doc_type || "").toUpperCase() === "BILL_OF_LADING",
        ),
        inv: items.some(
          (d) => (d.doc_type || "").toUpperCase() === "COMMERCIAL_INVOICE",
        ),
        weight: false,
      });
    } catch (err) {
      console.error("load shipment docs", err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  const [rejectionReason, setRejectionReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);
  const allChecked =
    Object.keys(checks).length > 0 && Object.values(checks).every(Boolean);

  async function handleVerify(status: string) {
    setSubmitting(true);
    try {
      const token = getStoredToken();
      const action =
        status === "REJECTED"
          ? "REJECT"
          : status === "VERIFIED"
            ? "APPROVE"
            : status;
      const reason =
        status === "REJECTED" ? rejectionReason || "No reason provided" : "";
      await apiFetch(`/api/v1/seller/shipments/${id}/verify`, {
        method: "POST",
        token: token ?? undefined,
        body: JSON.stringify({ action, checks, reason }),
      });
      toast(`Shipment ${status.toLowerCase()} successfully.`, "success");
      setRejectionReason("");
      setShowRejectForm(false);
      // Go back to workspace after verification
      router.push("/dashboard");
    } catch (err: unknown) {
      console.error("verify error", err);
      const msg = err instanceof Error ? err.message : "Verification failed";
      toast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-ec-text">Shipment Details</h2>
          <p className="text-sm text-ec-text-muted mt-1">ID: {id}</p>
        </div>
        <button
          className="ec-btn-ghost flex items-center gap-2"
          onClick={() => router.back()}
        >
          Back to Dashboard
        </button>
      </div>

      {loading ? (
        <div className="ec-card p-10 text-center text-ec-text-muted">
          Loading shipment details...
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="ec-card p-6">
              <h3 className="mb-4 text-lg font-bold text-ec-text">
                Uploaded Documents
              </h3>
              <DocumentViewer docs={docs} apiPrefix="/api/v1/seller" />
              {docs.length === 0 && (
                <div className="p-10 text-center border-2 border-dashed border-ec-border rounded-lg text-ec-text-muted">
                  No documents found for this shipment.
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="ec-card p-6 bg-ec-surface-raised">
              <h4 className="text-sm font-bold text-ec-text border-b pb-2 mb-3">
                Declared cargo
              </h4>
              <div className="space-y-2 text-sm text-ec-text-secondary">
                <p>
                  <span className="font-semibold text-ec-text">Route:</span>{" "}
                  {shipment?.origin_port || "Origin"} to{" "}
                  {shipment?.destination_port || "destination"}
                </p>
                <p>
                  <span className="font-semibold text-ec-text">Cargo:</span>{" "}
                  {shipment?.cargo_type || "Not recorded"}
                </p>
                <p>
                  <span className="font-semibold text-ec-text">Weight:</span>{" "}
                  {shipment?.weight_kg ? `${shipment.weight_kg} kg` : "Not recorded"}
                </p>
                <p>
                  <span className="font-semibold text-ec-text">Volume:</span>{" "}
                  {shipment?.volume_cbm ? `${shipment.volume_cbm} cbm` : "Not recorded"}
                </p>
              </div>
            </div>

            <div className="ec-card p-6">
              <h3 className="mb-4 text-lg font-bold text-ec-text">
                Document Checklist
              </h3>
              <div className="space-y-4">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checks.bol}
                    onChange={() => setChecks((s) => ({ ...s, bol: !s.bol }))}
                    className="h-5 w-5 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                  />
                  <span className="text-sm text-ec-text group-hover:text-ec-text-strong transition-colors">
                    Bill of Lading Verified
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checks.inv}
                    onChange={() => setChecks((s) => ({ ...s, inv: !s.inv }))}
                    className="h-5 w-5 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                  />
                  <span className="text-sm text-ec-text group-hover:text-ec-text-strong transition-colors">
                    Commercial Invoice Verified
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={!!checks.weight}
                    onChange={() =>
                      setChecks((s) => ({ ...s, weight: !s.weight }))
                    }
                    className="h-5 w-5 rounded border-ec-border text-ec-accent focus:ring-ec-accent"
                  />
                  <span className="text-sm text-ec-text group-hover:text-ec-text-strong transition-colors">
                    Declared cargo weight matches documents
                  </span>
                </label>
              </div>

              <div className="mt-8 space-y-3">
                <button
                  onClick={() => handleVerify("VERIFIED")}
                  disabled={!allChecked || submitting}
                  className="ec-btn-primary w-full py-3 text-base font-bold shadow-lg shadow-ec-accent/20 transition-all active:scale-95 disabled:opacity-50 disabled:grayscale disabled:scale-100"
                >
                  {submitting ? "Processing..." : "Approve Shipment"}
                </button>

                {!showRejectForm ? (
                  <button
                    onClick={() => setShowRejectForm(true)}
                    disabled={submitting}
                    className="ec-btn-ghost w-full py-3 text-sm text-red-500 hover:bg-red-50 hover:text-red-600 transition-colors"
                  >
                    Reject Shipment
                  </button>
                ) : (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-4 space-y-3">
                    <label className="block">
                      <p className="text-sm font-semibold text-red-700 mb-2">
                        Rejection Reason
                      </p>
                      <textarea
                        value={rejectionReason}
                        onChange={(e) => setRejectionReason(e.target.value)}
                        placeholder="Specify which document(s) need to be corrected and why. E.g., ' has incorrect amounts' or 'Bill of Lading dates do not match shipment details'"
                        className="w-full px-3 py-2 border border-red-300 rounded-lg text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        rows={3}
                        disabled={submitting}
                      />
                    </label>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleVerify("REJECTED")}
                        disabled={!rejectionReason.trim() || submitting}
                        className="flex-1 ec-btn-primary bg-red-600 hover:bg-red-700 py-2 text-sm font-bold transition-colors disabled:opacity-50"
                      >
                        {submitting ? "Processing..." : "Confirm Rejection"}
                      </button>
                      <button
                        onClick={() => {
                          setShowRejectForm(false);
                          setRejectionReason("");
                        }}
                        disabled={submitting}
                        className="flex-1 ec-btn-ghost border border-gray-300 py-2 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!allChecked && (
                <p className="mt-4 text-xs text-center text-ec-text-muted italic">
                  * Verify all documents to enable approval
                </p>
              )}
            </div>

            <div className="ec-card p-6 bg-ec-surface-raised">
              <h4 className="text-sm font-bold text-ec-text border-b pb-2 mb-3">
                Shipment Status
              </h4>
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse"></div>
                <span className="text-sm font-medium">
                  Pending Verification
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
