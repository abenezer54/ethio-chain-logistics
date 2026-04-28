"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CheckCircle2,
  PackageCheck,
  RefreshCw,
  Route,
  Ship,
  Truck,
  X,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/ToastProvider";
import { getStoredToken } from "@/lib/auth-storage";
import {
  allocateShipment,
  listAvailableTransportSlots,
  listVerifiedShipmentsForAllocation,
  type TransportSlot,
  type TransportType,
} from "@/lib/esl";
import type { Shipment } from "@/lib/shipments";

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

function shortID(id: string): string {
  return id ? id.slice(0, 8).toUpperCase() : "UNKNOWN";
}

function numberValue(value?: string): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCapacity(value?: string, suffix = "kg"): string {
  const n = numberValue(value);
  if (n <= 0) return "0";
  return `${new Intl.NumberFormat().format(n)} ${suffix}`;
}

function capacityPercent(slot: TransportSlot): number {
  const total = numberValue(slot.capacity_kg);
  const remaining = numberValue(slot.remaining_capacity_kg);
  if (total <= 0) return 0;
  return Math.max(0, Math.min(100, (remaining / total) * 100));
}

function remainingAfter(slot: TransportSlot, shipment?: Shipment): number {
  if (!shipment) return numberValue(slot.remaining_capacity_kg);
  return numberValue(slot.remaining_capacity_kg) - numberValue(shipment.weight_kg);
}

function slotCanCarry(slot: TransportSlot, shipment?: Shipment): boolean {
  if (!shipment) return true;
  return remainingAfter(slot, shipment) >= 0;
}

function capacityUnits(slot: TransportSlot, shipment?: Shipment): {
  total: number;
  used: number;
  shipmentUnits: number;
} {
  const total = slot.transport_type === "SHIP" ? 30 : 12;
  const capacity = numberValue(slot.capacity_kg);
  const remaining = numberValue(slot.remaining_capacity_kg);
  const shipmentWeight = numberValue(shipment?.weight_kg);
  if (capacity <= 0) return { total, used: 0, shipmentUnits: 0 };
  const used = Math.max(
    0,
    Math.min(total, Math.round(((capacity - remaining) / capacity) * total)),
  );
  const shipmentUnits =
    shipmentWeight > 0
      ? Math.max(1, Math.ceil((shipmentWeight / capacity) * total))
      : 0;
  return { total, used, shipmentUnits };
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong.";
}

function ModeIcon({ type }: { type: TransportType }) {
  return type === "SHIP" ? <Ship size={18} aria-hidden /> : <Truck size={18} aria-hidden />;
}

function modeLabel(type: TransportType): string {
  return type === "SHIP" ? "Ship" : "Truck";
}

function CapacityMap({
  slot,
  shipment,
  compact = false,
}: {
  slot: TransportSlot;
  shipment?: Shipment;
  compact?: boolean;
}) {
  const { total, used, shipmentUnits } = capacityUnits(slot, shipment);
  const canCarry = slotCanCarry(slot, shipment);
  const shipmentWeight = numberValue(shipment?.weight_kg);
  const capacity = numberValue(slot.capacity_kg);
  const usesMinimumMarker =
    canCarry &&
    shipmentWeight > 0 &&
    capacity > 0 &&
    (shipmentWeight / capacity) * total < 1;
  const columns = slot.transport_type === "SHIP" ? 6 : 4;
  const cells = Array.from({ length: total }, (_, index) => {
    const reservedEnd = used + shipmentUnits;
    const isUsed = index < used;
    const isShipment = canCarry && index >= used && index < reservedEnd;
    const isFirstShipment = isShipment && index === used;
    return { index, isUsed, isShipment, isFirstShipment };
  });

  return (
    <div className={compact ? "mt-4" : "mt-5"}>
      <div
        className={`relative overflow-hidden border border-ec-border bg-ec-surface-raised ${
          slot.transport_type === "SHIP"
            ? "rounded-l-lg rounded-r-full px-4 py-4 pr-9"
            : "rounded-lg p-3"
        }`}
      >
        {slot.transport_type === "TRUCK" ? (
          <div className="absolute right-2 top-1/2 hidden h-12 w-9 -translate-y-1/2 rounded-md border border-ec-border bg-ec-card sm:block" />
        ) : (
          <div className="absolute right-2 top-1/2 h-10 w-10 -translate-y-1/2 rounded-full border border-ec-border bg-ec-card/80" />
        )}
        <div
          className={`relative grid gap-1.5 ${compact ? "max-w-sm" : "max-w-md"}`}
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
        >
          {cells.map((cell) => (
            <span
              key={cell.index}
              className={`flex h-8 items-center justify-center rounded-md border text-[9px] font-extrabold leading-none shadow-sm ${
                cell.isUsed
                  ? "border-slate-400 bg-slate-300"
                  : cell.isShipment
                    ? "border-orange-700 bg-orange-600 text-white ring-4 ring-orange-200"
                    : "border-emerald-300 bg-emerald-100"
              }`}
              title={
                cell.isShipment
                  ? `This shipment: ${formatCapacity(shipment?.weight_kg)}`
                  : undefined
              }
            >
              {cell.isFirstShipment ? (
                compact ? (
                  <span className="h-2.5 w-2.5 rounded-full bg-white shadow-sm" />
                ) : (
                  "LOAD"
                )
              ) : null}
            </span>
          ))}
        </div>
      </div>
      {shipmentWeight > 0 ? (
        <div
          className={`mt-3 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-xs text-orange-800 ${
            compact ? "inline-flex" : "flex"
          }`}
        >
          <span className="font-bold">Orange marker:</span>
          <span className="ml-1">
            this shipment is {formatCapacity(shipment?.weight_kg)}
            {usesMinimumMarker
              ? "; shown as one minimum visible block."
              : "."}
          </span>
        </div>
      ) : null}
      {!compact ? (
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-ec-text-muted">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-slate-400 bg-slate-300" />
            Used
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-emerald-300 bg-emerald-100" />
            Available
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded border border-ec-accent bg-ec-accent" />
            This shipment
          </span>
        </div>
      ) : null}
    </div>
  );
}

function ShipmentCard({
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
        <div>
          <p className="text-xs font-semibold uppercase text-ec-text-muted">
            Shipment {shortID(shipment.id)}
          </p>
          <h3 className="mt-1 flex flex-wrap items-center gap-2 text-base font-bold text-ec-text">
            {shipment.origin_port}
            <ArrowRight size={16} aria-hidden />
            {shipment.destination_port}
          </h3>
        </div>
        <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800">
          Verified
        </span>
      </div>
      <div className="mt-4 grid gap-2 text-sm text-ec-text-secondary sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <Boxes size={16} aria-hidden />
          {shipment.cargo_type}
        </span>
        <span className="inline-flex items-center gap-2">
          <PackageCheck size={16} aria-hidden />
          {formatCapacity(shipment.weight_kg)}
        </span>
      </div>
    </button>
  );
}

function SlotSummary({
  title,
  slot,
  type,
  shipment,
  onOpen,
}: {
  title: string;
  slot?: TransportSlot;
  type: TransportType;
  shipment?: Shipment;
  onOpen: () => void;
}) {
  const after = slot ? remainingAfter(slot, shipment) : 0;

  return (
    <button
      type="button"
      onClick={onOpen}
      className="w-full rounded-lg border border-ec-border bg-ec-card p-4 text-left shadow-sm transition-colors hover:border-ec-accent/50 hover:bg-ec-surface-raised focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase text-ec-text-muted">
            <ModeIcon type={type} />
            {title}
          </p>
          <h3 className="mt-2 text-base font-bold text-ec-text">
            {slot ? slot.name : `Choose available ${modeLabel(type).toLowerCase()}`}
          </h3>
          {slot ? (
            <p className="mt-1 text-xs text-ec-text-muted">
              {slot.reference_code} - {slot.origin} to {slot.destination}
            </p>
          ) : null}
        </div>
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-800">
          {slot ? "Selected" : "Open"}
        </span>
      </div>

      {slot ? (
        <div className="mt-4">
          <CapacityMap slot={slot} shipment={shipment} compact />
          <div className="flex justify-between text-xs font-medium text-ec-text-muted">
            <span>{formatCapacity(slot.remaining_capacity_kg)} left</span>
            <span>{formatCapacity(slot.capacity_kg)} total</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-ec-border">
            <div
              className="h-full rounded-full bg-ec-accent"
              style={{ width: `${capacityPercent(slot)}%` }}
            />
          </div>
          {shipment ? (
            <p className={`mt-2 text-xs ${after < 0 ? "text-ec-danger" : "text-ec-text-muted"}`}>
              After this shipment: {after < 0 ? "not enough capacity" : formatCapacity(String(after))}
            </p>
          ) : null}
        </div>
      ) : null}
    </button>
  );
}

function SlotPickerModal({
  open,
  type,
  title,
  slots,
  selectedSlotID,
  shipment,
  onSelect,
  onClose,
}: {
  open: boolean;
  type: TransportType;
  title: string;
  slots: TransportSlot[];
  selectedSlotID: string;
  shipment?: Shipment;
  onSelect: (slotID: string) => void;
  onClose: () => void;
}) {
  const visibleSlots = useMemo(
    () => slots.filter((slot) => slot.transport_type === type),
    [slots, type],
  );
  const [previewSlotID, setPreviewSlotID] = useState("");

  if (!open) return null;

  const effectivePreviewSlotID = visibleSlots.some(
    (slot) => slot.id === previewSlotID,
  )
    ? previewSlotID
    : visibleSlots.some((slot) => slot.id === selectedSlotID)
      ? selectedSlotID
      : visibleSlots[0]?.id ?? "";
  const previewSlot =
    visibleSlots.find((slot) => slot.id === effectivePreviewSlotID) ??
    visibleSlots[0];
  const previewCanCarry = previewSlot
    ? slotCanCarry(previewSlot, shipment)
    : false;
  const previewAfter = previewSlot
    ? remainingAfter(previewSlot, shipment)
    : 0;
  const previewBlockKG = previewSlot
    ? numberValue(previewSlot.capacity_kg) / capacityUnits(previewSlot).total
    : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        className="fixed inset-0 bg-ec-navy/60 backdrop-blur-sm"
        aria-label="Close slot picker"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[90vh] w-full max-w-6xl flex-col overflow-hidden rounded-lg border border-ec-border bg-ec-card shadow-2xl"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between gap-3 border-b border-ec-border px-5 py-4">
          <div>
            <p className="text-xs font-semibold uppercase text-ec-accent">
              {modeLabel(type)} capacity
            </p>
            <h2 className="text-lg font-bold text-ec-text">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ec-text-muted hover:bg-ec-surface-raised hover:text-ec-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent"
            aria-label="Close"
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="grid min-h-0 gap-0 overflow-hidden md:grid-cols-[minmax(260px,0.9fr)_minmax(0,1.45fr)]">
          {visibleSlots.length === 0 ? (
            <div className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-6 text-center md:col-span-2 m-5">
              <ModeIcon type={type} />
              <p className="mt-3 font-semibold text-ec-text">
                No available {modeLabel(type).toLowerCase()} slots
              </p>
            </div>
          ) : (
            <>
              <div className="min-h-0 overflow-y-auto border-b border-ec-border bg-ec-surface-raised p-4 md:border-b-0 md:border-r">
                <div className="space-y-3">
                  {visibleSlots.map((slot) => {
                    const selected = slot.id === selectedSlotID;
                    const previewing = slot.id === effectivePreviewSlotID;
                    const canCarry = slotCanCarry(slot, shipment);

                    return (
                      <button
                        key={slot.id}
                        type="button"
                        onClick={() => setPreviewSlotID(slot.id)}
                        className={`w-full rounded-lg border p-4 text-left shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ec-accent ${
                          previewing
                            ? "border-ec-accent bg-ec-accent/5"
                            : "border-ec-border bg-ec-card hover:border-ec-border-strong"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-ec-text-muted">
                              <ModeIcon type={slot.transport_type} />
                              {slot.reference_code}
                            </p>
                            <h3 className="mt-1 truncate text-sm font-bold text-ec-text">
                              {slot.name}
                            </h3>
                          </div>
                          <span
                            className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                              selected
                                ? "border-ec-accent bg-ec-accent/10 text-ec-accent"
                                : canCarry
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-red-200 bg-red-50 text-red-700"
                            }`}
                          >
                            {selected ? "Selected" : canCarry ? "Open" : "Too small"}
                          </span>
                        </div>
                        <div className="mt-3 flex justify-between text-xs text-ec-text-muted">
                          <span>{formatCapacity(slot.remaining_capacity_kg)} left</span>
                          <span>{formatDate(slot.available_from)}</span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-ec-border">
                          <div
                            className="h-full rounded-full bg-ec-accent"
                            style={{ width: `${capacityPercent(slot)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto p-5">
                {previewSlot ? (
                  <div>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <p className="flex items-center gap-2 text-xs font-semibold uppercase text-ec-text-muted">
                          <ModeIcon type={previewSlot.transport_type} />
                          {previewSlot.reference_code}
                        </p>
                        <h3 className="mt-1 text-2xl font-bold text-ec-text">
                          {previewSlot.name}
                        </h3>
                        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-ec-text-secondary">
                          <Route size={16} aria-hidden />
                          {previewSlot.origin} to {previewSlot.destination}
                        </p>
                      </div>
                      <button
                        type="button"
                        disabled={!previewCanCarry}
                        onClick={() => {
                          onSelect(previewSlot.id);
                          onClose();
                        }}
                        className="ec-btn-primary"
                      >
                        Use this {modeLabel(type).toLowerCase()}
                      </button>
                    </div>

                    <CapacityMap slot={previewSlot} shipment={shipment} />

                    <div className="mt-5 grid gap-3 sm:grid-cols-3">
                      <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
                        <p className="text-xs font-semibold uppercase text-ec-text-muted">
                          Total capacity
                        </p>
                        <p className="mt-1 font-bold text-ec-text">
                          {formatCapacity(previewSlot.capacity_kg)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
                        <p className="text-xs font-semibold uppercase text-ec-text-muted">
                          Remaining
                        </p>
                        <p className="mt-1 font-bold text-ec-text">
                          {formatCapacity(previewSlot.remaining_capacity_kg)}
                        </p>
                      </div>
                      <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
                        <p className="text-xs font-semibold uppercase text-ec-text-muted">
                          One visual block
                        </p>
                        <p className="mt-1 font-bold text-ec-text">
                          {formatCapacity(String(previewBlockKG))}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 rounded-lg border border-ec-border bg-ec-card p-4">
                      <div className="flex justify-between text-xs font-medium text-ec-text-muted">
                        <span>{formatCapacity(previewSlot.remaining_capacity_kg)} left now</span>
                        <span>{formatCapacity(previewSlot.capacity_kg)} total</span>
                      </div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-ec-border">
                        <div
                          className="h-full rounded-full bg-ec-accent"
                          style={{ width: `${capacityPercent(previewSlot)}%` }}
                        />
                      </div>
                      <p className={`mt-3 text-sm ${previewCanCarry ? "text-ec-text-secondary" : "text-ec-danger"}`}>
                        {previewCanCarry
                          ? `After this shipment: ${formatCapacity(String(previewAfter))} remaining`
                          : "This slot does not have enough remaining kg for the selected shipment."}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ESLWorkspace() {
  const { toast } = useToast();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [slots, setSlots] = useState<TransportSlot[]>([]);
  const [selectedShipmentID, setSelectedShipmentID] = useState("");
  const [selectedShipSlotID, setSelectedShipSlotID] = useState("");
  const [selectedTruckSlotID, setSelectedTruckSlotID] = useState("");
  const [picker, setPicker] = useState<TransportType | null>(null);
  const [departureDate, setDepartureDate] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [allocating, setAllocating] = useState(false);

  const selectedShipment = useMemo(
    () => shipments.find((shipment) => shipment.id === selectedShipmentID),
    [shipments, selectedShipmentID],
  );
  const selectedShipSlot = useMemo(
    () => slots.find((slot) => slot.id === selectedShipSlotID),
    [slots, selectedShipSlotID],
  );
  const selectedTruckSlot = useMemo(
    () => slots.find((slot) => slot.id === selectedTruckSlotID),
    [slots, selectedTruckSlotID],
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
        const [nextShipments, nextSlots] = await Promise.all([
          listVerifiedShipmentsForAllocation(token),
          listAvailableTransportSlots(token),
        ]);
        setShipments(nextShipments);
        setSlots(nextSlots);
        setSelectedShipmentID((current) =>
          nextShipments.some((shipment) => shipment.id === current)
            ? current
            : nextShipments[0]?.id ?? "",
        );
        setSelectedShipSlotID((current) =>
          nextSlots.some((slot) => slot.id === current && slot.transport_type === "SHIP")
            ? current
            : "",
        );
        setSelectedTruckSlotID((current) =>
          nextSlots.some((slot) => slot.id === current && slot.transport_type === "TRUCK")
            ? current
            : "",
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

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  async function submitAllocation(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const token = getStoredToken();
    if (
      !token ||
      !selectedShipmentID ||
      !selectedShipSlotID ||
      !selectedTruckSlotID ||
      !departureDate
    ) {
      return;
    }
    setAllocating(true);
    try {
      await allocateShipment(token, selectedShipmentID, {
        ship_slot_id: selectedShipSlotID,
        truck_slot_id: selectedTruckSlotID,
        expected_departure_date: departureDate,
        notes: notes.trim() || undefined,
      });
      toast("Shipment allocated across ship and truck legs.", "success");
      setNotes("");
      setDepartureDate("");
      setSelectedShipSlotID("");
      setSelectedTruckSlotID("");
      await loadWorkspace();
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setAllocating(false);
    }
  }

  const canSubmit =
    !!selectedShipmentID &&
    !!selectedShipSlotID &&
    !!selectedTruckSlotID &&
    !!departureDate &&
    (!selectedShipSlot || slotCanCarry(selectedShipSlot, selectedShipment)) &&
    (!selectedTruckSlot || slotCanCarry(selectedTruckSlot, selectedShipment));

  return (
    <>
      <main className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-8 md:px-8 xl:grid-cols-[minmax(300px,0.9fr)_minmax(0,1.4fr)]">
        <section className="ec-card rounded-lg">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase text-ec-accent">
                Allocation queue
              </p>
              <h2 className="mt-1 text-lg font-bold text-ec-text">
                Verified shipments
              </h2>
              <p className="mt-1 text-sm text-ec-text-secondary">
                Seller-approved shipments waiting for ship and truck allocation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => loadWorkspace(true)}
              disabled={refreshing}
              className="ec-btn-ghost border border-ec-border bg-ec-card"
              aria-label="Refresh ESL workspace"
            >
              {refreshing ? (
                <Spinner size="sm" label="Refreshing ESL workspace" />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading ? (
              <div className="flex min-h-52 items-center justify-center">
                <Spinner size="lg" label="Loading verified shipments" />
              </div>
            ) : shipments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-6 text-center">
                <PackageCheck
                  size={32}
                  className="mx-auto text-ec-text-muted"
                  aria-hidden
                />
                <h3 className="mt-3 font-bold text-ec-text">No verified queue</h3>
                <p className="mt-1 text-sm text-ec-text-secondary">
                  Shipments appear here after seller approval.
                </p>
              </div>
            ) : (
              shipments.map((shipment) => (
                <ShipmentCard
                  key={shipment.id}
                  shipment={shipment}
                  selected={shipment.id === selectedShipmentID}
                  onSelect={() => {
                    setSelectedShipmentID(shipment.id);
                    setSelectedShipSlotID("");
                    setSelectedTruckSlotID("");
                  }}
                />
              ))
            )}
          </div>
        </section>

        <form onSubmit={submitAllocation} className="space-y-6">
          <section className="ec-card rounded-lg">
            <p className="text-xs font-semibold uppercase text-ec-accent">
              Route allocation
            </p>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_auto_1fr] lg:items-stretch">
              <SlotSummary
                title="Sea leg"
                type="SHIP"
                slot={selectedShipSlot}
                shipment={selectedShipment}
                onOpen={() => setPicker("SHIP")}
              />
              <div className="hidden items-center justify-center text-ec-text-muted lg:flex">
                <ArrowRight size={24} aria-hidden />
              </div>
              <SlotSummary
                title="Inland truck leg"
                type="TRUCK"
                slot={selectedTruckSlot}
                shipment={selectedShipment}
                onOpen={() => setPicker("TRUCK")}
              />
            </div>
          </section>

          <section className="ec-card rounded-lg">
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end">
              <label className="block">
                <span className="ec-label">Expected departure date</span>
                <input
                  type="date"
                  className="ec-input mt-1"
                  value={departureDate}
                  onChange={(e) => setDepartureDate(e.target.value)}
                  disabled={allocating}
                  required
                />
              </label>

              <label className="block">
                <span className="ec-label">Allocation notes</span>
                <input
                  className="ec-input mt-1"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional handling notes"
                  disabled={allocating}
                />
              </label>

              <button
                type="submit"
                disabled={allocating || !canSubmit}
                className="ec-btn-primary h-[42px] px-6"
              >
                {allocating ? (
                  <>
                    <Spinner size="sm" label="Confirming allocation" />
                    Confirming
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={18} aria-hidden />
                    Confirm allocation
                  </>
                )}
              </button>
            </div>
          </section>
        </form>
      </main>

      <SlotPickerModal
        open={picker === "SHIP"}
        type="SHIP"
        title="Choose available ship"
        slots={slots}
        selectedSlotID={selectedShipSlotID}
        shipment={selectedShipment}
        onSelect={setSelectedShipSlotID}
        onClose={() => setPicker(null)}
      />
      <SlotPickerModal
        open={picker === "TRUCK"}
        type="TRUCK"
        title="Choose available truck"
        slots={slots}
        selectedSlotID={selectedTruckSlotID}
        shipment={selectedShipment}
        onSelect={setSelectedTruckSlotID}
        onClose={() => setPicker(null)}
      />
    </>
  );
}
