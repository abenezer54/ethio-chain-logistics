"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Download,
  FileCheck2,
  FileWarning,
  RefreshCw,
  Scale,
  ShieldCheck,
  Stamp,
} from "lucide-react";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { getStoredToken } from "@/lib/auth-storage";
import {
  fetchClearanceCertificate,
  getCustomsShipment,
  grantCustomsRelease,
  listCustomsArrivedShipments,
  type CustomsDocumentCheck,
  type CustomsShipmentDetail,
} from "@/lib/customs";
import type { Shipment, ShipmentEvent, ShipmentStatus } from "@/lib/shipments";

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  INITIATED: "Initiated",
  DOCS_UPLOADED: "Documents uploaded",
  PENDING_VERIFICATION: "Pending verification",
  VERIFIED: "Verified",
  APPROVED: "Approved",
  EXPORT_DOCS_UPLOADED: "Export docs uploaded",
  REJECTED: "Rejected",
  ALLOCATED: "Allocated",
  IN_TRANSIT: "In transit",
  ARRIVED: "Arrived",
  AT_CUSTOMS: "At customs",
  HELD_FOR_INSPECTION: "Held for inspection",
  CLEARED: "Cleared",
};

function shortID(id: string): string {
  return id ? id.slice(0, 8).toUpperCase() : "UNKNOWN";
}

function shortHash(value: string): string {
  if (!value) return "No hash";
  return `${value.slice(0, 12)}...${value.slice(-8)}`;
}

function numberValue(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatWeight(value?: string): string {
  const n = numberValue(value);
  if (n <= 0) return "0 kg";
  return `${new Intl.NumberFormat().format(n)} kg`;
}

function formatDateTime(iso?: string): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function docLabel(value: string): string {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

function statusTone(status: ShipmentStatus): string {
  switch (status) {
    case "ARRIVED":
    case "AT_CUSTOMS":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "CLEARED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    default:
      return "border-ec-border bg-ec-surface-raised text-ec-text-secondary";
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong.";
}

function ShipmentListItem({
  shipment,
  selected,
  onSelect,
}: {
  shipment: Shipment;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full rounded-lg border bg-ec-card p-4 text-left shadow-sm transition-colors hover:border-ec-border-strong hover:bg-ec-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent ${
        selected ? "border-ec-accent ring-1 ring-ec-accent/30" : "border-ec-border"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">
            Shipment {shortID(shipment.id)}
          </p>
          <h3 className="mt-1 flex flex-wrap items-center gap-2 text-base font-bold text-ec-text">
            <span className="truncate">{shipment.origin_port}</span>
            <ArrowRight size={16} aria-hidden />
            <span className="truncate">{shipment.destination_port}</span>
          </h3>
        </div>
        <span
          className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(
            shipment.status,
          )}`}
        >
          {STATUS_LABEL[shipment.status] ?? shipment.status}
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-ec-text-secondary sm:grid-cols-2">
        <span>{shipment.cargo_type}</span>
        <span>{formatWeight(shipment.weight_kg)}</span>
      </div>
    </button>
  );
}

function SummaryPanel({ detail }: { detail: CustomsShipmentDetail }) {
  const shipment = detail.shipment;
  const matched = detail.documents.filter((doc) => doc.hash_matches).length;

  return (
    <section className="ec-card rounded-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-ec-accent">
            Customs review
          </p>
          <h2 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-ec-text">
            {shipment.origin_port}
            <ArrowRight size={18} aria-hidden />
            {shipment.destination_port}
          </h2>
          <p className="mt-1 text-sm text-ec-text-muted">
            Shipment {shortID(shipment.id)}
          </p>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(
            shipment.status,
          )}`}
        >
          {STATUS_LABEL[shipment.status] ?? shipment.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Cargo</p>
          <p className="mt-1 truncate font-bold text-ec-text">{shipment.cargo_type}</p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Weight</p>
          <p className="mt-1 font-bold text-ec-text">{formatWeight(shipment.weight_kg)}</p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Documents</p>
          <p className="mt-1 font-bold text-ec-text">
            {matched}/{detail.documents.length} matched
          </p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Release</p>
          <p className="mt-1 font-bold text-ec-text">
            {detail.release_ready ? "Ready" : "Blocked"}
          </p>
        </div>
      </div>
    </section>
  );
}

function DocumentPanel({ documents }: { documents: CustomsDocumentCheck[] }) {
  return (
    <section className="ec-card rounded-lg">
      <p className="text-xs font-semibold uppercase text-ec-accent">Document hashes</p>
      <div className="mt-4 space-y-3">
        {documents.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-6 text-center">
            <FileWarning size={30} className="mx-auto text-ec-text-muted" aria-hidden />
            <p className="mt-2 text-sm text-ec-text-secondary">No documents found.</p>
          </div>
        ) : (
          documents.map((doc) => (
            <div
              key={`${doc.source}-${doc.id}`}
              className="rounded-lg border border-ec-border bg-ec-surface-raised p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase text-ec-text-muted">
                    {doc.source} - {docLabel(doc.doc_type)}
                  </p>
                  <h3 className="mt-1 truncate font-bold text-ec-text">
                    {doc.original_file_name}
                  </h3>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    doc.hash_matches
                      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                      : "border-red-200 bg-red-50 text-red-700"
                  }`}
                >
                  {doc.hash_matches ? (
                    <FileCheck2 size={14} aria-hidden />
                  ) : (
                    <FileWarning size={14} aria-hidden />
                  )}
                  {doc.hash_status.replaceAll("_", " ")}
                </span>
              </div>
              <div className="mt-3 grid gap-2 text-xs text-ec-text-muted md:grid-cols-[1fr_auto]">
                <span className="truncate">SHA-256: {shortHash(doc.sha256_hash)}</span>
                <span>{formatDateTime(doc.uploaded_at)}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Timeline({ events }: { events: ShipmentEvent[] }) {
  const sorted = [...events].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  );

  return (
    <section className="ec-card rounded-lg">
      <p className="text-xs font-semibold uppercase text-ec-accent">Audit trail</p>
      <div className="mt-4 space-y-4">
        {sorted.length === 0 ? (
          <p className="text-sm text-ec-text-secondary">No audit events recorded.</p>
        ) : (
          sorted.map((event) => (
            <div
              key={event.id}
              className="rounded-lg border border-ec-border bg-ec-surface-raised p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h3 className="font-bold text-ec-text">
                    {event.action.replaceAll("_", " ")}
                  </h3>
                  {event.message ? (
                    <p className="mt-1 text-sm text-ec-text-secondary">{event.message}</p>
                  ) : null}
                </div>
                <span className="text-xs font-medium text-ec-text-muted">
                  {formatDateTime(event.created_at)}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-ec-text-muted">
                {event.from_status || event.to_status ? (
                  <span className="rounded-full border border-ec-border bg-ec-card px-2.5 py-1">
                    {event.from_status || "New"} to {event.to_status || "Updated"}
                  </span>
                ) : null}
                <span className="rounded-full border border-ec-border bg-ec-card px-2.5 py-1">
                  {shortHash(event.event_hash)}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function ReleasePanel({
  detail,
  releasing,
  downloading,
  onRelease,
  onDownload,
}: {
  detail: CustomsShipmentDetail;
  releasing: boolean;
  downloading: boolean;
  onRelease: () => void;
  onDownload: () => void;
}) {
  const cleared = detail.shipment.status === "CLEARED";
  const canRelease =
    detail.release_ready &&
    (detail.shipment.status === "ARRIVED" || detail.shipment.status === "AT_CUSTOMS");

  return (
    <section className="ec-card rounded-lg">
      <p className="text-xs font-semibold uppercase text-ec-accent">Final release</p>
      <div className="mt-4 flex items-start gap-3 rounded-lg border border-ec-border bg-ec-surface-raised p-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ec-accent/10 text-ec-accent">
          {cleared ? <ShieldCheck size={20} aria-hidden /> : <Scale size={20} aria-hidden />}
        </span>
        <div>
          <h3 className="font-bold text-ec-text">
            {cleared ? "Digital release granted" : "Awaiting customs release"}
          </h3>
          <p className="mt-1 text-sm text-ec-text-secondary">
            {cleared
              ? "This shipment is cleared. The release event is recorded in the audit trail."
              : "Release is enabled after the required document hashes match the stored originals."}
          </p>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row">
        {cleared ? (
          <button
            type="button"
            onClick={onDownload}
            disabled={downloading}
            className="ec-btn-primary justify-center"
          >
            {downloading ? (
              <Spinner size="sm" label="Generating certificate" />
            ) : (
              <Download size={18} aria-hidden />
            )}
            Certificate PDF
          </button>
        ) : (
          <button
            type="button"
            onClick={onRelease}
            disabled={!canRelease || releasing}
            className="ec-btn-primary justify-center"
          >
            {releasing ? (
              <Spinner size="sm" label="Granting digital release" />
            ) : (
              <Stamp size={18} aria-hidden />
            )}
            Grant digital release
          </button>
        )}
      </div>
    </section>
  );
}

export default function CustomsWorkspace() {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [detail, setDetail] = useState<CustomsShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [releasing, setReleasing] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === selectedID),
    [shipments, selectedID],
  );

  const loadQueue = useCallback(
    async (showRefresh = false) => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      try {
        const nextShipments = await listCustomsArrivedShipments(token);
        setShipments(nextShipments);
        setSelectedID((current) =>
          nextShipments.some((shipment) => shipment.id === current)
            ? current
            : nextShipments[0]?.id ?? "",
        );
      } catch (err) {
        toast(errorMessage(err), "error");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [toast],
  );

  const loadDetail = useCallback(
    async (shipmentID: string) => {
      const token = getStoredToken();
      if (!token || !shipmentID) return;
      setDetailLoading(true);
      try {
        setDetail(await getCustomsShipment(token, shipmentID));
      } catch (err) {
        toast(errorMessage(err), "error");
        setDetail(null);
      } finally {
        setDetailLoading(false);
      }
    },
    [toast],
  );

  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedID) {
      setDetail(null);
      return;
    }
    loadDetail(selectedID);
  }, [selectedID, loadDetail]);

  async function grantRelease() {
    const token = getStoredToken();
    const active = detail ?? selectedShipment;
    if (!token || !active) return;
    const shipmentID = "shipment" in active ? active.shipment.id : active.id;

    setReleasing(true);
    try {
      const released = await grantCustomsRelease(token, shipmentID);
      setDetail({
        ...released,
        documents: Array.isArray(released.documents) ? released.documents : [],
        events: Array.isArray(released.events) ? released.events : [],
      });
      setShipments((current) =>
        current.filter((shipment) => shipment.id !== shipmentID),
      );
      toast("Digital release granted.", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setReleasing(false);
      setConfirmOpen(false);
    }
  }

  async function downloadCertificate() {
    const token = getStoredToken();
    if (!token || !detail) return;
    setDownloading(true);
    try {
      const blob = await fetchClearanceCertificate(token, detail.shipment.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `clearance-${shortID(detail.shipment.id)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast("Clearance certificate generated.", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setDownloading(false);
    }
  }

  const activeDetail = detail;

  return (
    <>
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 md:px-8 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.5fr)]">
        <section className="ec-card rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-ec-accent">
                Customs queue
              </p>
              <h2 className="mt-1 text-lg font-bold text-ec-text">
                Awaiting clearance
              </h2>
              <p className="mt-1 text-sm text-ec-text-secondary">
                Arrived shipments ready for audit and hash review.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadQueue(true)}
              disabled={refreshing}
              className="ec-btn-ghost border border-ec-border bg-ec-card"
              aria-label="Refresh customs workspace"
            >
              {refreshing ? (
                <Spinner size="sm" label="Refreshing customs workspace" />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="flex min-h-52 items-center justify-center">
                <Spinner size="lg" label="Loading customs queue" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-6 text-center">
                <CheckCircle2
                  size={32}
                  className="mx-auto text-ec-text-muted"
                  aria-hidden
                />
                <h3 className="mt-3 font-bold text-ec-text">No clearance queue</h3>
                <p className="mt-1 text-sm text-ec-text-secondary">
                  Shipments appear here after arriving at the dry port.
                </p>
              </div>
            ) : (
              shipments.map((shipment) => (
                <ShipmentListItem
                  key={shipment.id}
                  shipment={shipment}
                  selected={shipment.id === selectedID}
                  onSelect={() => setSelectedID(shipment.id)}
                />
              ))
            )}
          </div>
        </section>

        <div className="space-y-6">
          {detailLoading && !activeDetail ? (
            <section className="ec-card flex min-h-64 items-center justify-center rounded-lg">
              <Spinner size="lg" label="Loading customs detail" />
            </section>
          ) : activeDetail ? (
            <>
              <SummaryPanel detail={activeDetail} />
              <ReleasePanel
                detail={activeDetail}
                releasing={releasing}
                downloading={downloading}
                onRelease={() => setConfirmOpen(true)}
                onDownload={downloadCertificate}
              />
              <DocumentPanel documents={activeDetail.documents} />
              <Timeline events={activeDetail.events} />
            </>
          ) : (
            <section className="ec-card flex min-h-64 items-center justify-center rounded-lg">
              <div className="text-center">
                <Scale size={32} className="mx-auto text-ec-text-muted" aria-hidden />
                <h2 className="mt-3 font-bold text-ec-text">Select a shipment</h2>
                <p className="mt-1 text-sm text-ec-text-secondary">
                  Audit trail and document hashes will appear here.
                </p>
              </div>
            </section>
          )}

          {detailLoading && activeDetail ? (
            <div className="fixed bottom-4 right-4 rounded-lg border border-ec-border bg-ec-card px-4 py-3 shadow-lg">
              <span className="inline-flex items-center gap-2 text-sm font-medium text-ec-text-secondary">
                <Spinner size="sm" label="Refreshing customs detail" />
                Refreshing detail
              </span>
            </div>
          ) : null}
        </div>
      </main>

      <ConfirmDialog
        open={confirmOpen}
        title="Grant digital release?"
        description="This changes the shipment to CLEARED and records an irreversible customs release event in the audit trail."
        confirmLabel="Grant release"
        cancelLabel="Review again"
        variant="warning"
        busy={releasing}
        onConfirm={grantRelease}
        onCancel={() => !releasing && setConfirmOpen(false)}
      />
    </>
  );
}
