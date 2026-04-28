"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Anchor,
  ArrowRight,
  CalendarDays,
  CheckCircle2,
  CircleDot,
  Crosshair,
  MapPin,
  PackageCheck,
  RefreshCw,
  Route,
  Ship,
  Truck,
  type LucideIcon,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { getStoredToken } from "@/lib/auth-storage";
import type { Shipment, ShipmentEvent, ShipmentStatus } from "@/lib/shipments";
import {
  addTransportMilestone,
  getTransporterShipment,
  listAssignedTransporterShipments,
  type TransportMilestone,
  type TransporterShipment,
} from "@/lib/transporter";

type MilestoneConfig = {
  id: TransportMilestone;
  label: string;
  place: string;
  icon: LucideIcon;
};

const MILESTONES: MilestoneConfig[] = [
  {
    id: "DEPARTED_ORIGIN_PORT",
    label: "Departed from origin port",
    place: "Origin port",
    icon: Anchor,
  },
  {
    id: "ARRIVED_DJIBOUTI_PORT",
    label: "Arrived at Djibouti port",
    place: "Djibouti port",
    icon: MapPin,
  },
  {
    id: "IN_TRANSIT_BY_LAND",
    label: "In transit by land",
    place: "Road leg",
    icon: Truck,
  },
  {
    id: "ARRIVED_DRY_PORT",
    label: "Arrived at dry port",
    place: "Modjo/Akaki",
    icon: CheckCircle2,
  },
];

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

const ACTION_TO_MILESTONE: Record<string, TransportMilestone> = {
  TRANSPORT_DEPARTED_ORIGIN_PORT: "DEPARTED_ORIGIN_PORT",
  TRANSPORT_ARRIVED_DJIBOUTI_PORT: "ARRIVED_DJIBOUTI_PORT",
  TRANSPORT_IN_TRANSIT_BY_LAND: "IN_TRANSIT_BY_LAND",
  TRANSPORT_ARRIVED_DRY_PORT: "ARRIVED_DRY_PORT",
};

function shortID(id: string): string {
  return id ? id.slice(0, 8).toUpperCase() : "UNKNOWN";
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

function formatDate(iso?: string): string {
  if (!iso) return "Not set";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not set";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
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

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong.";
}

function TransportModeIcon({
  type,
  size = 16,
}: {
  type: "SHIP" | "TRUCK";
  size?: number;
}) {
  return type === "SHIP" ? (
    <Ship size={size} aria-hidden />
  ) : (
    <Truck size={size} aria-hidden />
  );
}

function modeLabel(type: "SHIP" | "TRUCK"): string {
  return type === "SHIP" ? "Ship" : "Truck";
}

function legLabel(legType: string): string {
  return legType === "SEA" ? "Sea leg" : "Inland leg";
}

function milestonesForLeg(legType: string): MilestoneConfig[] {
  if (legType === "SEA") {
    return MILESTONES.filter(
      (item) =>
        item.id === "DEPARTED_ORIGIN_PORT" ||
        item.id === "ARRIVED_DJIBOUTI_PORT",
    );
  }
  return MILESTONES.filter(
    (item) =>
      item.id === "IN_TRANSIT_BY_LAND" || item.id === "ARRIVED_DRY_PORT",
  );
}

function metadataValue(
  metadata: ShipmentEvent["metadata"] | undefined,
  key: string,
): string {
  const value = metadata?.[key];
  if (value === undefined || value === null) return "";
  return typeof value === "string" ? value : String(value);
}

function eventMilestone(event: ShipmentEvent): TransportMilestone | null {
  const fromMetadata = metadataValue(event.metadata, "milestone");
  if (MILESTONES.some((item) => item.id === fromMetadata)) {
    return fromMetadata as TransportMilestone;
  }
  return ACTION_TO_MILESTONE[event.action] ?? null;
}

function eventBelongsToAssignment(
  event: ShipmentEvent,
  item: TransporterShipment,
): boolean {
  const allocationID = metadataValue(event.metadata, "allocation_id");
  if (allocationID) return allocationID === item.allocation.id;

  const legType = metadataValue(event.metadata, "leg_type");
  if (legType) return legType === item.allocation.leg_type;

  const milestone = eventMilestone(event);
  return milestonesForLeg(item.allocation.leg_type).some(
    (visible) => visible.id === milestone,
  );
}

function completedMilestones(item: TransporterShipment): Set<TransportMilestone> {
  const completed = new Set<TransportMilestone>();
  for (const event of item.events ?? []) {
    if (!eventBelongsToAssignment(event, item)) continue;
    const milestone = eventMilestone(event);
    if (milestone) completed.add(milestone);
  }
  return completed;
}

function nextMilestone(
  status: ShipmentStatus,
  completed: Set<TransportMilestone>,
  visibleMilestones: MilestoneConfig[],
): TransportMilestone | null {
  if (status === "CLEARED") {
    return null;
  }
  return (
    visibleMilestones.find((milestone) => !completed.has(milestone.id))?.id ??
    null
  );
}

function statusTone(status: ShipmentStatus): string {
  switch (status) {
    case "ALLOCATED":
      return "border-blue-200 bg-blue-50 text-blue-800";
    case "IN_TRANSIT":
      return "border-amber-200 bg-amber-50 text-amber-800";
    case "ARRIVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "CLEARED":
      return "border-slate-300 bg-slate-100 text-slate-700";
    default:
      return "border-ec-border bg-ec-surface-raised text-ec-text-secondary";
  }
}

function ShipmentListItem({
  item,
  selected,
  onSelect,
}: {
  item: TransporterShipment;
  selected: boolean;
  onSelect: () => void;
}) {
  const shipment = item.shipment;
  const slot = item.transport_slot;

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
        <span className="inline-flex items-center gap-2">
          <PackageCheck size={16} aria-hidden />
          {formatWeight(shipment.weight_kg)}
        </span>
        <span className="inline-flex items-center gap-2">
          <TransportModeIcon type={slot.transport_type} />
          {legLabel(item.allocation.leg_type)}: {slot.reference_code}
        </span>
      </div>
    </button>
  );
}

function TransportSlotPanel({ item }: { item: TransporterShipment }) {
  const slot = item.transport_slot;
  const used = Math.max(0, numberValue(slot.capacity_kg) - numberValue(slot.remaining_capacity_kg));
  const total = numberValue(slot.capacity_kg);
  const usedPercent = total > 0 ? Math.min(100, Math.max(0, (used / total) * 100)) : 0;

  return (
    <section className="ec-card rounded-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-ec-accent">
            <TransportModeIcon type={slot.transport_type} />
            Assigned {modeLabel(slot.transport_type).toLowerCase()} - {legLabel(item.allocation.leg_type)}
          </p>
          <h2 className="mt-2 text-xl font-bold text-ec-text">{slot.name}</h2>
          <p className="mt-1 text-sm text-ec-text-muted">{slot.reference_code}</p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised px-3 py-2 text-sm text-ec-text-secondary">
          <CalendarDays size={16} className="mr-2 inline" aria-hidden />
          {formatDate(item.allocation.expected_departure_at)}
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">
            {modeLabel(slot.transport_type)} capacity
          </p>
          <p className="mt-1 font-bold text-ec-text">{formatWeight(slot.capacity_kg)}</p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Remaining</p>
          <p className="mt-1 font-bold text-ec-text">{formatWeight(slot.remaining_capacity_kg)}</p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Route</p>
          <p className="mt-1 truncate font-bold text-ec-text">
            {slot.origin} to {slot.destination}
          </p>
        </div>
      </div>

      <div className="mt-4">
        <div className="flex justify-between text-xs font-medium text-ec-text-muted">
          <span>{formatWeight(String(used))} used</span>
          <span>{formatWeight(slot.capacity_kg)} total</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-ec-border">
          <div
            className="h-full rounded-full bg-ec-accent"
            style={{ width: `${usedPercent}%` }}
          />
        </div>
      </div>
    </section>
  );
}

function MilestonePanel({
  item,
  latitude,
  longitude,
  locationNote,
  gpsLoading,
  submitting,
  onLatitude,
  onLongitude,
  onLocationNote,
  onUseGPS,
  onSubmit,
}: {
  item: TransporterShipment;
  latitude: string;
  longitude: string;
  locationNote: string;
  gpsLoading: boolean;
  submitting: TransportMilestone | null;
  onLatitude: (value: string) => void;
  onLongitude: (value: string) => void;
  onLocationNote: (value: string) => void;
  onUseGPS: () => void;
  onSubmit: (milestone: TransportMilestone) => void;
}) {
  const visibleMilestones = useMemo(
    () => milestonesForLeg(item.allocation.leg_type),
    [item.allocation.leg_type],
  );
  const completed = useMemo(() => completedMilestones(item), [item]);
  const suggested = nextMilestone(
    item.shipment.status,
    completed,
    visibleMilestones,
  );
  const terminal =
    item.shipment.status === "CLEARED" ||
    visibleMilestones.every((milestone) => completed.has(milestone.id));

  return (
    <section className="ec-card rounded-lg">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase text-ec-accent">Journey milestones</p>
          <h2 className="mt-1 text-lg font-bold text-ec-text">
            {legLabel(item.allocation.leg_type)} - {STATUS_LABEL[item.shipment.status] ?? item.shipment.status}
          </h2>
        </div>
        <button
          type="button"
          onClick={onUseGPS}
          disabled={gpsLoading}
          className="ec-btn-ghost border border-ec-border bg-ec-card"
        >
          {gpsLoading ? (
            <Spinner size="sm" label="Capturing GPS" />
          ) : (
            <Crosshair size={16} aria-hidden />
          )}
          Use current location
        </button>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-3">
        <label className="block">
          <span className="ec-label">Latitude</span>
          <input
            className="ec-input mt-1"
            value={latitude}
            onChange={(event) => onLatitude(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className="ec-label">Longitude</span>
          <input
            className="ec-input mt-1"
            value={longitude}
            onChange={(event) => onLongitude(event.target.value)}
            placeholder="Optional"
          />
        </label>
        <label className="block">
          <span className="ec-label">Location note</span>
          <input
            className="ec-input mt-1"
            value={locationNote}
            onChange={(event) => onLocationNote(event.target.value)}
            placeholder="Optional"
          />
        </label>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {visibleMilestones.map((milestone) => {
          const Icon = milestone.icon;
          const done = completed.has(milestone.id);
          const recommended = suggested === milestone.id;
          const disabled = done || terminal || submitting !== null;

          return (
            <button
              key={milestone.id}
              type="button"
              onClick={() => onSubmit(milestone.id)}
              disabled={disabled}
              className={`rounded-lg border p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent ${
                done
                  ? "border-emerald-200 bg-emerald-50"
                  : recommended
                    ? "border-ec-accent bg-ec-accent/5 hover:border-ec-accent"
                    : "border-ec-border bg-ec-card hover:border-ec-border-strong hover:bg-ec-surface-raised"
              } disabled:cursor-not-allowed disabled:opacity-70`}
            >
              <div className="flex items-start justify-between gap-3">
                <span
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                    done ? "bg-emerald-600 text-white" : "bg-ec-surface-raised text-ec-accent"
                  }`}
                >
                  {submitting === milestone.id ? (
                    <Spinner size="sm" label={`Updating ${milestone.label}`} />
                  ) : (
                    <Icon size={19} aria-hidden />
                  )}
                </span>
                <span
                  className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                    done
                      ? "border-emerald-200 bg-white text-emerald-800"
                      : recommended
                        ? "border-ec-accent/30 bg-white text-ec-accent"
                        : "border-ec-border bg-ec-surface-raised text-ec-text-muted"
                  }`}
                >
                  {done ? "Done" : recommended ? "Next" : "Open"}
                </span>
              </div>
              <h3 className="mt-3 font-bold text-ec-text">{milestone.label}</h3>
              <p className="mt-1 text-sm text-ec-text-muted">{milestone.place}</p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

function ShipmentSummary({ shipment }: { shipment: Shipment }) {
  return (
    <section className="ec-card rounded-lg">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase text-ec-accent">
            Shipment {shortID(shipment.id)}
          </p>
          <h2 className="mt-2 flex flex-wrap items-center gap-2 text-xl font-bold text-ec-text">
            {shipment.origin_port}
            <ArrowRight size={18} aria-hidden />
            {shipment.destination_port}
          </h2>
        </div>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-semibold ${statusTone(
            shipment.status,
          )}`}
        >
          {STATUS_LABEL[shipment.status] ?? shipment.status}
        </span>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Cargo</p>
          <p className="mt-1 truncate font-bold text-ec-text">{shipment.cargo_type}</p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Weight</p>
          <p className="mt-1 font-bold text-ec-text">{formatWeight(shipment.weight_kg)}</p>
        </div>
        <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
          <p className="text-xs font-semibold uppercase text-ec-text-muted">Updated</p>
          <p className="mt-1 font-bold text-ec-text">{formatDate(shipment.updated_at)}</p>
        </div>
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
          <div className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-6 text-center">
            <CircleDot size={28} className="mx-auto text-ec-text-muted" aria-hidden />
            <p className="mt-2 text-sm text-ec-text-secondary">No transport events yet.</p>
          </div>
        ) : (
          sorted.map((event) => {
            const lat = metadataValue(event.metadata, "latitude");
            const lng = metadataValue(event.metadata, "longitude");
            const note = metadataValue(event.metadata, "location_note");

            return (
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
                  {lat && lng ? (
                    <span className="rounded-full border border-ec-border bg-ec-card px-2.5 py-1">
                      GPS {lat}, {lng}
                    </span>
                  ) : null}
                  {note ? (
                    <span className="rounded-full border border-ec-border bg-ec-card px-2.5 py-1">
                      {note}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}

export default function TransporterWorkspace() {
  const { toast } = useToast();
  const [items, setItems] = useState<TransporterShipment[]>([]);
  const [selectedID, setSelectedID] = useState("");
  const [detail, setDetail] = useState<TransporterShipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState<TransportMilestone | null>(null);
  const [gpsLoading, setGPSLoading] = useState(false);
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [locationNote, setLocationNote] = useState("");

  const selectedListItem = useMemo(
    () => items.find((item) => item.allocation.id === selectedID),
    [items, selectedID],
  );

  const loadWorkspace = useCallback(
    async (showRefresh = false) => {
      const token = getStoredToken();
      if (!token) {
        setLoading(false);
        return;
      }
      if (showRefresh) setRefreshing(true);
      try {
        const nextItems = await listAssignedTransporterShipments(token);
        setItems(nextItems);
        setSelectedID((current) =>
          nextItems.some((item) => item.allocation.id === current)
            ? current
            : nextItems[0]?.allocation.id ?? "",
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
    async (shipmentID: string, allocationID: string) => {
      const token = getStoredToken();
      if (!token || !shipmentID || !allocationID) return;
      setDetailLoading(true);
      try {
        setDetail(await getTransporterShipment(token, shipmentID, allocationID));
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
    loadWorkspace();
  }, [loadWorkspace]);

  useEffect(() => {
    if (!selectedID) {
      setDetail(null);
      return;
    }
    const item = items.find((candidate) => candidate.allocation.id === selectedID);
    if (item) loadDetail(item.shipment.id, item.allocation.id);
  }, [selectedID, items, loadDetail]);

  function useCurrentLocation() {
    if (!navigator.geolocation) {
      toast("GPS is not available in this browser.", "error");
      return;
    }
    setGPSLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude));
        setLongitude(String(position.coords.longitude));
        setGPSLoading(false);
        toast("GPS location captured.", "success");
      },
      () => {
        setGPSLoading(false);
        toast("Could not capture GPS location.", "error");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submitMilestone(milestone: TransportMilestone) {
    const token = getStoredToken();
    const active = detail ?? selectedListItem;
    if (!token || !active) return;

    setSubmitting(milestone);
    try {
      const updated = await addTransportMilestone(token, active.shipment.id, {
        allocation_id: active.allocation.id,
        milestone,
        latitude: latitude.trim() || undefined,
        longitude: longitude.trim() || undefined,
        location_note: locationNote.trim() || undefined,
      });
      const normalized = {
        ...updated,
        events: Array.isArray(updated.events) ? updated.events : [],
      };
      setDetail(normalized);
      setItems((current) =>
        current.map((item) =>
          item.allocation.id === normalized.allocation.id ? normalized : item,
        ),
      );
      setLocationNote("");
      toast("Transport milestone recorded.", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setSubmitting(null);
    }
  }

  const activeDetail = detail ?? selectedListItem ?? null;

  return (
    <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 md:px-8 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.5fr)]">
      <section className="ec-card rounded-lg">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-ec-accent">
              Transport queue
            </p>
            <h2 className="mt-1 text-lg font-bold text-ec-text">
              Assigned shipments
            </h2>
            <p className="mt-1 text-sm text-ec-text-secondary">
              Allocated ship and truck legs ready for milestone updates.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadWorkspace(true)}
            disabled={refreshing}
            className="ec-btn-ghost border border-ec-border bg-ec-card"
            aria-label="Refresh transporter workspace"
          >
            {refreshing ? (
              <Spinner size="sm" label="Refreshing transporter workspace" />
            ) : (
              <RefreshCw size={16} aria-hidden />
            )}
          </button>
        </div>

        <div className="mt-5 space-y-3">
          {loading ? (
            <div className="flex min-h-52 items-center justify-center">
              <Spinner size="lg" label="Loading assigned shipments" />
            </div>
          ) : items.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-6 text-center">
              <Truck size={32} className="mx-auto text-ec-text-muted" aria-hidden />
              <h3 className="mt-3 font-bold text-ec-text">No assigned shipments</h3>
              <p className="mt-1 text-sm text-ec-text-secondary">
                Allocations appear here when the ESL agent assigns your ship or truck.
              </p>
            </div>
          ) : (
            items.map((item) => (
              <ShipmentListItem
                key={item.allocation.id}
                item={item}
                selected={item.allocation.id === selectedID}
                onSelect={() => setSelectedID(item.allocation.id)}
              />
            ))
          )}
        </div>
      </section>

      <div className="space-y-6">
        {detailLoading && !activeDetail ? (
          <section className="ec-card flex min-h-64 items-center justify-center rounded-lg">
            <Spinner size="lg" label="Loading shipment details" />
          </section>
        ) : activeDetail ? (
          <>
            <ShipmentSummary shipment={activeDetail.shipment} />
            <TransportSlotPanel item={activeDetail} />
            <MilestonePanel
              item={activeDetail}
              latitude={latitude}
              longitude={longitude}
              locationNote={locationNote}
              gpsLoading={gpsLoading}
              submitting={submitting}
              onLatitude={setLatitude}
              onLongitude={setLongitude}
              onLocationNote={setLocationNote}
              onUseGPS={useCurrentLocation}
              onSubmit={submitMilestone}
            />
            <Timeline events={activeDetail.events ?? []} />
          </>
        ) : (
          <section className="ec-card flex min-h-64 items-center justify-center rounded-lg">
            <div className="text-center">
              <Route size={32} className="mx-auto text-ec-text-muted" aria-hidden />
              <h2 className="mt-3 font-bold text-ec-text">Select a shipment</h2>
              <p className="mt-1 text-sm text-ec-text-secondary">
                Route and milestone details will appear here.
              </p>
            </div>
          </section>
        )}

        {detailLoading && activeDetail ? (
          <div className="fixed bottom-4 right-4 rounded-lg border border-ec-border bg-ec-card px-4 py-3 shadow-lg">
            <span className="inline-flex items-center gap-2 text-sm font-medium text-ec-text-secondary">
              <Spinner size="sm" label="Refreshing details" />
              Refreshing details
            </span>
          </div>
        ) : null}
      </div>
    </main>
  );
}
