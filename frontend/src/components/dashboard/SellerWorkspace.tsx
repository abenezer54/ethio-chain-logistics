"use client";
import { useEffect, useState, useCallback } from "react";
import PendingVerifications from "@/components/seller/PendingVerifications";
import ApprovedShipments from "@/components/seller/ApprovedShipments";
import ShipmentTimeline from "@/components/seller/ShipmentTimeline";
import { useRouter } from "next/navigation";
import { getStoredToken } from "@/lib/auth-storage";
import { apiFetch } from "@/lib/api";
import {
  ClipboardCheck,
  LayoutDashboard,
  Clock,
  ChevronRight,
  TrendingUp,
  FileBadge,
  ArrowRight,
} from "lucide-react";

type Shipment = {
  id: string;
  origin_port?: string;
  destination_port?: string;
  status?: string;
  created_at?: string;
};

export default function SellerWorkspace() {
  const [pending, setPending] = useState<Shipment[]>([]);
  const [approved, setApproved] = useState<Shipment[]>([]);
  const [docsUploaded, setDocsUploaded] = useState<Shipment[]>([]);
  const [transit, setTransit] = useState<Shipment[]>([]);
  const [allShipments, setAllShipments] = useState<Shipment[]>([]);
  const [selectedShipment, setSelectedShipment] = useState<Shipment | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // Color constants for easier maintenance
  const actionOrange = "#F37021";

  const fetchAll = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const token = getStoredToken();

        const [pJson, aJson, allJson] = await Promise.all([
          apiFetch<{ items: Shipment[] }>("/api/v1/seller/pending", {
            token: token ?? undefined,
            signal,
          }),
          apiFetch<{ items: Shipment[] }>("/api/v1/seller/approved", {
            token: token ?? undefined,
            signal,
          }),
          apiFetch<{ items: Shipment[] }>("/api/v1/seller/all", {
            token: token ?? undefined,
            signal,
          }),
        ]);

        const pendingList = Array.isArray(pJson.items) ? pJson.items : [];
        const approvedList = Array.isArray(aJson.items) ? aJson.items : [];
        const allList = Array.isArray(allJson.items) ? allJson.items : [];

        setPending(pendingList);

        // Filter categories
        const inTransit = approvedList.filter((s) =>
          ["ALLOCATED", "IN_TRANSIT", "ARRIVED"].includes(
            (s.status || "").toUpperCase(),
          ),
        );
        const docsUploadedList = approvedList.filter(
          (s) => (s.status || "").toUpperCase() === "EXPORT_DOCS_UPLOADED",
        );
        const justApproved = approvedList.filter(
          (s) =>
            ![
              "ALLOCATED",
              "IN_TRANSIT",
              "ARRIVED",
              "EXPORT_DOCS_UPLOADED",
            ].includes((s.status || "").toUpperCase()),
        );

        setApproved(justApproved);
        setDocsUploaded(docsUploadedList);
        setTransit(inTransit);

        // Use all shipments endpoint which includes rejected ones
        const combined = allList.sort(
          (a, b) =>
            new Date(b.created_at || 0).getTime() -
            new Date(a.created_at || 0).getTime(),
        );
        setAllShipments(combined);

        // Auto-select first if none selected
        if (combined.length > 0 && !selectedShipment) {
          // setSelectedShipment(combined[0]);
        }
      } catch (e) {
        if ((e as DOMException)?.name === "AbortError") return;
        console.error("seller page fetch error", e);
      } finally {
        setLoading(false);
      }
    },
    [selectedShipment],
  );

  useEffect(() => {
    const ac = new AbortController();
    fetchAll(ac.signal);
    return () => ac.abort();
  }, [fetchAll]);

  return (
    <div className="mx-auto w-full max-w-7xl">
      {/* Stats Summary Section */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <div
          className="ec-card p-5 border-l-4 bg-white transition-transform hover:scale-[1.02]"
          style={{ borderLeftColor: actionOrange }}
        >
          <div className="flex items-center gap-4">
            <div
              className="rounded-xl p-3"
              style={{
                backgroundColor: `${actionOrange}1A`,
                color: actionOrange,
              }}
            >
              <ClipboardCheck size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ec-text-muted">
                Need Review
              </p>
              <h3 className="text-2xl font-bold text-ec-text">
                {pending.length}
              </h3>
            </div>
          </div>
        </div>

        <div
          className="ec-card p-5 border-l-4 bg-white transition-transform hover:scale-[1.02]"
          style={{ borderLeftColor: actionOrange }}
        >
          <div className="flex items-center gap-4">
            <div
              className="rounded-xl p-3"
              style={{
                backgroundColor: `${actionOrange}1A`,
                color: actionOrange,
              }}
            >
              <FileBadge size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ec-text-muted">
                Export document Pending
              </p>
              <h3 className="text-2xl font-bold text-ec-text">
                {approved.length}
              </h3>
            </div>
          </div>
        </div>

        <div
          className="ec-card p-5 border-l-4 bg-white transition-transform hover:scale-[1.02]"
          style={{ borderLeftColor: actionOrange }}
        >
          <div className="flex items-center gap-4">
            <div
              className="rounded-xl p-3"
              style={{
                backgroundColor: `${actionOrange}1A`,
                color: actionOrange,
              }}
            >
              <TrendingUp size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ec-text-muted">
                Active Tracking
              </p>
              <h3 className="text-2xl font-bold text-ec-text">
                {transit.length}
              </h3>
            </div>
          </div>
        </div>

        <div
          className="ec-card p-5 border-l-4 bg-white transition-transform hover:scale-[1.02]"
          style={{ borderLeftColor: actionOrange }}
        >
          <div className="flex items-center gap-4">
            <div
              className="rounded-xl p-3"
              style={{
                backgroundColor: `${actionOrange}1A`,
                color: actionOrange,
              }}
            >
              <LayoutDashboard size={24} />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-ec-text-muted">
                Total Active
              </p>
              <h3 className="text-2xl font-bold text-ec-text">
                {pending.length +
                  approved.length +
                  docsUploaded.length +
                  transit.length}
              </h3>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-8">
        {/* Top Row: Pending Actions (Side-by-Side) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Pending Verifications */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Clock style={{ color: actionOrange }} size={20} />
                <h3 className="text-lg font-bold text-ec-text">
                  Shipments Awaiting Approval
                </h3>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: `${actionOrange}1A`,
                  color: actionOrange,
                }}
              >
                {pending.length} New
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                Array.from({ length: 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="ec-card p-6 h-32 animate-pulse bg-ec-surface-raised"
                  />
                ))
              ) : (
                <PendingVerifications
                  items={pending}
                  onSelect={(id: string) =>
                    router.push(`/dashboard/shipment/${encodeURIComponent(id)}`)
                  }
                />
              )}
            </div>
          </section>

          {/* Approved & Awaiting Documents */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <FileBadge style={{ color: actionOrange }} size={20} />
                <h3 className="text-lg font-bold text-ec-text">
                  Approved & Awaiting Documents
                </h3>
              </div>
              <span
                className="rounded-full px-3 py-1 text-xs font-bold"
                style={{
                  backgroundColor: `${actionOrange}1A`,
                  color: actionOrange,
                }}
              >
                {approved.length} Pending
              </span>
            </div>
            <div className="grid grid-cols-1 gap-4">
              {loading ? (
                Array.from({ length: 1 }).map((_, i) => (
                  <div
                    key={i}
                    className="ec-card p-6 h-32 animate-pulse bg-ec-surface-raised"
                  />
                ))
              ) : (
                <ApprovedShipments
                  items={approved}
                  onSelect={(id: string) =>
                    router.push(
                      `/dashboard/shipment/${encodeURIComponent(id)}/performa`,
                    )
                  }
                />
              )}
            </div>
          </section>
        </div>

        {/* All Shipments & Status Tracking Section */}
        <section className="pt-8 border-t border-ec-border">
          <div className="flex items-center gap-2 mb-6">
            <LayoutDashboard style={{ color: actionOrange }} size={22} />
            <h3 className="text-xl font-bold text-ec-text">
              All Shipments & Tracking
            </h3>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 min-h-150">
            {/* Left Column: List of All Shipments */}
            <div className="lg:col-span-5 flex flex-col gap-4">
              <div className="flex flex-col gap-3 max-h-175 overflow-y-auto pr-2 custom-scrollbar">
                {loading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-20 w-full animate-pulse bg-ec-surface-raised rounded-xl"
                    />
                  ))
                ) : allShipments.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-ec-border rounded-2xl text-ec-text-muted">
                    No shipments found.
                  </div>
                ) : (
                  allShipments.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setSelectedShipment(s)}
                      className="group flex items-center justify-between p-4 rounded-xl border transition-all duration-200 text-left"
                      style={{
                        backgroundColor:
                          selectedShipment?.id === s.id
                            ? actionOrange
                            : "white",
                        borderColor:
                          selectedShipment?.id === s.id
                            ? actionOrange
                            : "#E5E7EB", // fallback to gray-200 if ec-border not picked up
                        boxShadow:
                          selectedShipment?.id === s.id
                            ? "0 10px 15px -3px rgba(0, 0, 0, 0.1)"
                            : "none",
                        transform:
                          selectedShipment?.id === s.id
                            ? "translateX(4px)"
                            : "none",
                      }}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span
                            className={`text-[10px] font-mono font-bold uppercase
                            ${selectedShipment?.id === s.id ? "text-white/60" : "text-ec-text-muted"}
                          `}
                          >
                            #{s.id.slice(0, 8)}
                          </span>
                          <span
                            className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase"
                            style={{
                              backgroundColor:
                                selectedShipment?.id === s.id
                                  ? "rgba(255,255,255,0.2)"
                                  : "#F3F4F6",
                              color:
                                selectedShipment?.id === s.id
                                  ? "white"
                                  : "#6B7280",
                            }}
                          >
                            {s.status?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 truncate">
                          <span
                            className={`text-sm font-bold truncate ${selectedShipment?.id === s.id ? "text-white" : "text-ec-text"}`}
                          >
                            {s.origin_port}
                          </span>
                          <ArrowRight
                            size={12}
                            className={
                              selectedShipment?.id === s.id
                                ? "text-white/40"
                                : "text-ec-text-muted"
                            }
                          />
                          <span
                            className={`text-sm font-bold truncate ${selectedShipment?.id === s.id ? "text-white" : "text-ec-text"}`}
                          >
                            {s.destination_port}
                          </span>
                        </div>
                      </div>
                      <ChevronRight
                        size={16}
                        className={`shrink-0 transition-transform ${selectedShipment?.id === s.id ? "rotate-90 text-white" : "group-hover:translate-x-1 opacity-20 text-ec-text"}`}
                      />
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Right Column: Status Timeline */}
            <div className="lg:col-span-7">
              <div className="sticky top-8">
                <ShipmentTimeline shipment={selectedShipment} />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
