"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  ClipboardList,
  Download,
  FileText,
  Hash,
  MapPin,
  PackagePlus,
  RefreshCw,
  Route,
  ShieldCheck,
  Upload,
} from "lucide-react";
import { Spinner } from "@/components/ui/Spinner";
import { Skeleton } from "@/components/ui/Skeleton";
import { useToast } from "@/components/ui/ToastProvider";
import { getStoredToken } from "@/lib/auth-storage";
import {
  createImporterShipment,
  getImporterShipment,
  listImporterShipments,
  shipmentDocumentDownloadUrl,
  sellerShipmentDocumentDownloadUrl,
  uploadShipmentDocuments,
  type CreateShipmentPayload,
  type DocumentVerificationStatus,
  type Shipment,
  type ShipmentDetail,
  type ShipmentDocument,
  type ShipmentEvent,
  type ShipmentStatus,
} from "@/lib/shipments";
import { API_BASE } from "@/lib/api";
// replaced SellerSelector with country + seller dropdowns
type SellerOption = {
  id: string;
  business_name?: string;
  email?: string;
  origin_country?: string;
};

const STATUS_STEPS: ShipmentStatus[] = [
  "INITIATED",
  "DOCS_UPLOADED",
  "PENDING_VERIFICATION",
  "VERIFIED",
  "EXPORT_DOCS_UPLOADED",
  "APPROVED",
  "ALLOCATED",
  "IN_TRANSIT",
  "ARRIVED",
  "AT_CUSTOMS",
  "CLEARED",
];

const STATUS_LABEL: Record<ShipmentStatus, string> = {
  INITIATED: "Initiated",
  DOCS_UPLOADED: "Docs uploaded",
  PENDING_VERIFICATION: "Pending verification",
  VERIFIED: "Verified",
  APPROVED: "Approved",
  ALLOCATED: "Allocated",
  IN_TRANSIT: "In transit",
  ARRIVED: "Arrived",
  AT_CUSTOMS: "At customs",
  HELD_FOR_INSPECTION: "Held for inspection",
  EXPORT_DOCS_UPLOADED: "Seller uploaded documents",
  REJECTED: "Rejected - Re-upload required",
  CLEARED: "Cleared",
};

const DOC_LABEL: Record<ShipmentDocument["doc_type"], string> = {
  BILL_OF_LADING: "Bill of Lading",
  COMMERCIAL_INVOICE: "Commercial Invoice",
  LETTER_OF_CREDIT: "Letter of Credit",
  SUPPLEMENTAL: "Supplemental",
};

const CARGO_TYPES = [
  "Electronics",
  "Textiles and garments",
  "Machinery",
  "Automotive parts",
  "Food products",
  "Pharmaceuticals",
  "Construction materials",
  "Agricultural inputs",
  "Chemicals",
  "Medical equipment",
  "Industrial raw materials",
  "Consumer goods",
  "General cargo",
];

const ORIGIN_PORTS = [
  "Djibouti Port, Djibouti",
  "Berbera Port, Somaliland",
  "Port Sudan, Sudan",
  "Mombasa Port, Kenya",
  "Dar es Salaam Port, Tanzania",
  "Jebel Ali Port, United Arab Emirates",
  "Shanghai Port, China",
  "Ningbo-Zhoushan Port, China",
  "Shenzhen Port, China",
  "Guangzhou Port, China",
  "Qingdao Port, China",
  "Tianjin Port, China",
  "Singapore Port, Singapore",
  "Busan Port, South Korea",
  "Port Klang, Malaysia",
  "Tanjung Pelepas Port, Malaysia",
  "Laem Chabang Port, Thailand",
  "Ho Chi Minh City Port, Vietnam",
  "Chennai Port, India",
  "Nhava Sheva/JNPT, India",
  "Mundra Port, India",
  "Karachi Port, Pakistan",
  "Colombo Port, Sri Lanka",
  "King Abdulaziz Port Dammam, Saudi Arabia",
  "Jeddah Islamic Port, Saudi Arabia",
  "Sohar Port, Oman",
  "Salalah Port, Oman",
  "Hamad Port, Qatar",
  "Antwerp-Bruges Port, Belgium",
  "Rotterdam Port, Netherlands",
  "Hamburg Port, Germany",
  "Piraeus Port, Greece",
  "Valencia Port, Spain",
  "Genoa Port, Italy",
  "Felixstowe Port, United Kingdom",
  "New York/New Jersey Port, United States",
  "Los Angeles Port, United States",
  "Long Beach Port, United States",
  "Houston Port, United States",
  "Santos Port, Brazil",
  "Durban Port, South Africa",
  "Cape Town Port, South Africa",
  "Lagos/Apapa Port, Nigeria",
  "Tema Port, Ghana",
  "Alexandria Port, Egypt",
  "Suez Port, Egypt",
];

const DESTINATION_PORTS = [
  "Modjo Dry Port, Ethiopia",
  "Addis Ababa Hub, Ethiopia",
  "Dire Dawa Terminal, Ethiopia",
  "Kombolcha Dry Port, Ethiopia",
  "Mekelle Dry Port, Ethiopia",
  "Semera Dry Port, Ethiopia",
  "Gelan Logistics Terminal, Ethiopia",
  "Kality Customs Branch, Ethiopia",
  "Hawassa Industrial Park, Ethiopia",
  "Bole Lemi Industrial Park, Ethiopia",
  "Adama Industrial Park, Ethiopia",
  "Jimma Inland Terminal, Ethiopia",
  "Bahir Dar Logistics Hub, Ethiopia",
  "Dukem Eastern Industrial Zone, Ethiopia",
];

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  if (typeof e === "string") return e;
  return "Something went wrong.";
}

function formatDate(iso?: string): string {
  if (!iso) return "Not recorded";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Not recorded";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function shortID(id: string): string {
  return id ? id.slice(0, 8).toUpperCase() : "UNKNOWN";
}

function shortHash(hash: string): string {
  if (!hash) return "Not available";
  return `${hash.slice(0, 12)}...${hash.slice(-8)}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size.toFixed(unit === 0 ? 0 : 1)} ${units[unit]}`;
}

function statusTone(status: ShipmentStatus): string {
  switch (status) {
    case "CLEARED":
    case "VERIFIED":
    case "APPROVED":
    case "EXPORT_DOCS_UPLOADED":
      return "border-emerald-200 bg-emerald-50 text-emerald-800";
    case "HELD_FOR_INSPECTION":
    case "REJECTED":
      return "border-red-200 bg-red-50 text-red-800";
    case "IN_TRANSIT":
    case "ALLOCATED":
    case "ARRIVED":
    case "AT_CUSTOMS":
      return "border-blue-200 bg-blue-50 text-blue-800";
    default:
      return "border-amber-200 bg-amber-50 text-amber-800";
  }
}

function verificationTone(status: DocumentVerificationStatus): string {
  switch (status) {
    case "MATCHED":
      return "text-ec-success";
    case "MISMATCHED":
    case "REJECTED":
      return "text-ec-danger";
    default:
      return "text-ec-text-muted";
  }
}

function ShipmentSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
      <Skeleton className="h-24 rounded-lg" />
    </div>
  );
}

function ShipmentStatusBadge({ status }: { status: ShipmentStatus }) {
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusTone(status)}`}
    >
      {STATUS_LABEL[status]}
    </span>
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
        selected
          ? "border-ec-accent ring-1 ring-ec-accent/30"
          : "border-ec-border"
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
        <ShipmentStatusBadge status={shipment.status} />
      </div>
      <div className="mt-4 grid gap-2 text-sm text-ec-text-secondary sm:grid-cols-2">
        <span className="inline-flex items-center gap-2">
          <Boxes size={16} aria-hidden />
          {shipment.cargo_type}
        </span>
        <span className="inline-flex items-center gap-2">
          <CalendarClock size={16} aria-hidden />
          {formatDate(shipment.created_at)}
        </span>
      </div>
    </button>
  );
}

function SearchableSelect({
  label,
  value,
  options,
  placeholder,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  placeholder: string;
  disabled?: boolean;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return options.slice(0, 12);
    return options
      .filter((option) => option.toLowerCase().includes(q))
      .slice(0, 12);
  }, [options, value]);
  const isKnown = !value || options.includes(value);

  return (
    <label className="relative block">
      <span className="ec-label">{label}</span>
      <input
        className={`ec-input mt-1 ${!isKnown ? "ec-input-error" : ""}`}
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 120)}
        placeholder={placeholder}
        disabled={disabled}
        required
        autoComplete="off"
      />
      {open && filtered.length > 0 ? (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-64 overflow-y-auto rounded-lg border border-ec-border bg-ec-card py-1 shadow-lg">
          {filtered.map((option) => (
            <button
              key={option}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(option);
                setOpen(false);
              }}
              className={`block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-ec-surface-raised ${
                option === value
                  ? "font-semibold text-ec-accent"
                  : "text-ec-text-secondary"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      ) : null}
    </label>
  );
}

function CreateShipmentForm({
  busy,
  onCreate,
}: {
  busy: boolean;
  onCreate: (payload: CreateShipmentPayload) => Promise<void>;
}) {
  const [form, setForm] = useState<CreateShipmentPayload>({
    origin_port: "",
    destination_port: "",
    cargo_type: "",
    weight_kg: "",
    volume_cbm: "",
    seller_id: "",
  });

  const [allSellers, setAllSellers] = useState<
    {
      id: string;
      business_name?: string;
      email?: string;
      origin_country?: string;
    }[]
  >([]);
  const [countries, setCountries] = useState<string[]>([]);
  const [selectedCountry, setSelectedCountry] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    fetch(`${API_BASE}/api/v1/sellers?limit=500`)
      .then((r) => r.json())
      .then((j) => {
        if (!mounted) return;
        const items = Array.isArray(j.items) ? j.items : [];
        const itemsArr = items as SellerOption[];
        const normalized = itemsArr.map((s) => ({
          ...s,
          origin_country: (s.origin_country || "").trim(),
        }));
        setAllSellers(normalized);
        const uniq = Array.from(
          new Set(
            normalized.map((s) => s.origin_country || "").filter(Boolean),
          ),
        ).sort();
        setCountries(uniq);
      })
      .catch(() => {
        if (!mounted) return;
        setAllSellers([]);
        setCountries([]);
      });
    return () => {
      mounted = false;
    };
  }, []);

  function setField(key: keyof CreateShipmentPayload, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (
      !ORIGIN_PORTS.includes(form.origin_port.trim()) ||
      !DESTINATION_PORTS.includes(form.destination_port.trim()) ||
      !CARGO_TYPES.includes(form.cargo_type.trim())
    ) {
      return;
    }
    await onCreate({
      origin_port: form.origin_port.trim(),
      destination_port: form.destination_port.trim(),
      cargo_type: form.cargo_type.trim(),
      weight_kg: form.weight_kg.trim(),
      volume_cbm: form.volume_cbm?.trim() || undefined,
      seller_id: form.seller_id?.trim() || undefined,
    });
    setForm({
      origin_port: "",
      destination_port: "",
      cargo_type: "",
      weight_kg: "",
      volume_cbm: "",
      seller_id: "",
    });
  }

  const formReady =
    ORIGIN_PORTS.includes(form.origin_port.trim()) &&
    DESTINATION_PORTS.includes(form.destination_port.trim()) &&
    CARGO_TYPES.includes(form.cargo_type.trim()) &&
    !!form.weight_kg.trim() &&
    !!form.seller_id?.trim();

  return (
    <form onSubmit={onSubmit} className="ec-card rounded-lg" noValidate>
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-ec-accent/10 text-ec-accent">
          <PackagePlus size={22} aria-hidden />
        </span>
        <div>
          <h2 className="text-lg font-bold text-ec-text">Create shipment</h2>
          <p className="mt-1 text-sm text-ec-text-secondary">
            Start a shipment record, then attach the required documents.
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <SearchableSelect
          label="Origin port"
          value={form.origin_port}
          options={ORIGIN_PORTS}
          placeholder="Search origin port"
          disabled={busy}
          onChange={(value) => setField("origin_port", value)}
        />
        <SearchableSelect
          label="Destination"
          value={form.destination_port}
          options={DESTINATION_PORTS}
          placeholder="Search dry port or hub"
          disabled={busy}
          onChange={(value) => setField("destination_port", value)}
        />
        <label className="block">
          <span className="ec-label">Cargo type</span>
          <select
            className="ec-input mt-1"
            value={form.cargo_type}
            onChange={(e) => setField("cargo_type", e.target.value)}
            disabled={busy}
            required
          >
            <option value="">Select cargo type</option>
            {CARGO_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="ec-label">Weight in kg</span>
          <input
            className="ec-input mt-1"
            type="number"
            min="0"
            step="0.001"
            value={form.weight_kg}
            onChange={(e) => setField("weight_kg", e.target.value)}
            placeholder="1200"
            disabled={busy}
            required
          />
        </label>
        <label className="block">
          <span className="ec-label">Volume in cbm</span>
          <input
            className="ec-input mt-1"
            type="number"
            min="0"
            step="0.001"
            value={form.volume_cbm}
            onChange={(e) => setField("volume_cbm", e.target.value)}
            placeholder="18.5"
            disabled={busy}
          />
        </label>
        <label className="block">
          <span className="ec-label">Seller country</span>
          <select
            className="ec-input mt-1"
            value={selectedCountry}
            onChange={(e) => {
              setSelectedCountry(e.target.value);
              // clear seller selection when country changes
              setField("seller_id", "");
            }}
            disabled={busy}
          >
            <option value="">All countries</option>
            {countries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-2 text-xs text-ec-text-muted">
            Filter sellers by country
          </p>
        </label>

        <label className="block">
          <span className="ec-label">Seller</span>
          <select
            className="ec-input mt-1"
            value={form.seller_id}
            onChange={(e) => setField("seller_id", e.target.value)}
            disabled={busy}
          >
            <option value="">Select seller</option>
            {allSellers
              .filter((s) =>
                selectedCountry
                  ? (s.origin_country || "") === selectedCountry
                  : true,
              )
              .map((s) => (
                <option key={s.id} value={s.id}>
                  {s.business_name || s.email || s.id}
                </option>
              ))}
          </select>
          <p className="mt-1 text-xs text-ec-text-muted">
            Select the seller from the list.
          </p>
        </label>
      </div>

      <button
        type="submit"
        disabled={busy || !formReady}
        className="ec-btn-primary mt-5 w-full"
      >
        {busy ? (
          <>
            <Spinner size="sm" label="Creating shipment" />
            Creating shipment
          </>
        ) : (
          "Create shipment"
        )}
      </button>
    </form>
  );
}

function DocumentUploadForm({
  shipmentID,
  busy,
  onUpload,
}: {
  shipmentID: string;
  busy: boolean;
  onUpload: (shipmentID: string, formData: FormData) => Promise<void>;
}) {
  const [bill, setBill] = useState<File | null>(null);
  const [invoice, setInvoice] = useState<File | null>(null);
  const [letter, setLetter] = useState<File | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    if (bill) fd.set("bill_of_lading", bill);
    if (invoice) fd.set("commercial_invoice", invoice);
    if (letter) fd.set("letter_of_credit", letter);
    await onUpload(shipmentID, fd);
    setBill(null);
    setInvoice(null);
    setLetter(null);
    e.currentTarget.reset();
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-lg border border-ec-border bg-ec-surface-raised p-4"
    >
      <div className="flex items-center gap-2">
        <Upload size={18} className="text-ec-accent" aria-hidden />
        <h3 className="font-bold text-ec-text">Upload documents</h3>
      </div>
      <div className="mt-4 grid gap-3">
        <label className="block">
          <span className="ec-label">Bill of Lading</span>
          <input
            className="ec-input mt-1"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setBill(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
        </label>
        <label className="block">
          <span className="ec-label">Commercial Invoice</span>
          <input
            className="ec-input mt-1"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setInvoice(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
        </label>
        <label className="block">
          <span className="ec-label">Letter of Credit</span>
          <input
            className="ec-input mt-1"
            type="file"
            accept="application/pdf,image/*"
            onChange={(e) => setLetter(e.target.files?.[0] ?? null)}
            disabled={busy}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={busy || (!bill && !invoice && !letter)}
        className="ec-btn-navy mt-4 w-full"
      >
        {busy ? (
          <>
            <Spinner size="sm" label="Uploading documents" />
            Uploading documents
          </>
        ) : (
          "Upload selected documents"
        )}
      </button>
    </form>
  );
}

function ProgressSteps({ status }: { status: ShipmentStatus }) {
  const activeIndex = STATUS_STEPS.indexOf(status);
  return (
    <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {STATUS_STEPS.map((step, index) => {
        const active = index <= activeIndex && activeIndex >= 0;
        return (
          <div
            key={step}
            className={`rounded-lg border px-3 py-2 text-xs font-semibold ${
              active
                ? "border-ec-accent bg-ec-accent/10 text-ec-text"
                : "border-ec-border bg-ec-card text-ec-text-muted"
            }`}
          >
            {STATUS_LABEL[step]}
          </div>
        );
      })}
    </div>
  );
}

type ShipmentFileItem = {
  id: string;
  shipment_id: string;
  doc_type: string;
  original_file_name: string;
  content_type: string;
  size_bytes: number;
  sha256_hash: string;
  uploaded_at: string;
  verification_status?: DocumentVerificationStatus;
};

function DocumentsList({
  shipmentID,
  documents,
  token,
  downloadUrl,
}: {
  shipmentID: string;
  documents: ShipmentFileItem[];
  token: string;
  downloadUrl: (shipmentID: string, documentID: string) => string;
}) {
  if (!documents || documents.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-4 text-sm text-ec-text-muted">
        No documents uploaded yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {documents.map((doc) => (
        <div
          key={doc.id}
          className="rounded-lg border border-ec-border bg-ec-card p-4"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold text-ec-text">
                {DOC_LABEL[doc.doc_type as keyof typeof DOC_LABEL] ||
                  doc.doc_type}
              </p>
              <p className="mt-1 truncate text-sm text-ec-text-secondary">
                {doc.original_file_name}
              </p>
            </div>
            <a
              href={downloadUrl(shipmentID, doc.id)}
              target="_blank"
              rel="noreferrer"
              className="ec-btn-ghost border border-ec-border bg-ec-card"
              onClick={(e) => {
                if (!token) e.preventDefault();
              }}
            >
              <Download size={16} aria-hidden />
              Download
            </a>
          </div>
          <div className="mt-3 grid gap-2 text-xs text-ec-text-muted sm:grid-cols-3">
            <span className="inline-flex items-center gap-1.5">
              <ShieldCheck size={14} aria-hidden />
              {doc.verification_status ? (
                <span className={verificationTone(doc.verification_status)}>
                  {doc.verification_status}
                </span>
              ) : (
                <span className="text-ec-text-muted">Seller uploaded</span>
              )}
            </span>
            <span>{formatBytes(doc.size_bytes)}</span>
            <span>{formatDate(doc.uploaded_at)}</span>
          </div>
          <p className="mt-2 inline-flex max-w-full items-center gap-1.5 truncate text-xs text-ec-text-muted">
            <Hash size={13} aria-hidden />
            {shortHash(doc.sha256_hash)}
          </p>
        </div>
      ))}
    </div>
  );
}

// Helper function to safely convert unknown to string for rendering
function safeString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number") return value.toString();
  if (typeof value === "boolean") return value.toString();
  try {
    return JSON.stringify(value);
  } catch {
    return "";
  }
}

function Timeline({ events }: { events: ShipmentEvent[] }) {
  if (!events || events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-4 text-sm text-ec-text-muted">
        No audit events yet.
      </p>
    );
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => {
        // Safely extract values with type guards
        const action = safeString(event.action);
        const isRejection =
          action === "SHIPMENT_REJECTED" ||
          safeString(event.to_status) === "REJECTED";
        const message = event.message ? safeString(event.message) : null;
        const actorRole = safeString(event.actor_role);
        const toStatus = event.to_status ? safeString(event.to_status) : null;
        const rejectionReason = event.metadata?.reason
          ? safeString(event.metadata.reason)
          : null;

        return (
          <li
            key={safeString(event.id)}
            className={`rounded-lg border p-4 ${
              isRejection
                ? "border-red-200 bg-red-50"
                : "border-ec-border bg-ec-card"
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p
                className={`font-semibold ${
                  isRejection ? "text-red-700" : "text-ec-text"
                }`}
              >
                {action.replaceAll("_", " ")}
              </p>
              <span
                className={`text-xs ${isRejection ? "text-red-600" : "text-ec-text-muted"}`}
              >
                {formatDate(safeString(event.created_at))}
              </span>
            </div>
            {message && (
              <p
                className={`mt-1 text-sm ${
                  isRejection
                    ? "text-red-700 font-semibold"
                    : "text-ec-text-secondary"
                }`}
              >
                {message}
              </p>
            )}
            {isRejection && rejectionReason && (
              <div className="mt-2 border-t border-red-200 pt-2">
                <p className="text-xs font-semibold text-red-700 mb-1">
                  Reason for rejection:
                </p>
                <p className="text-sm text-red-700">{rejectionReason}</p>
              </div>
            )}
            <p
              className={`mt-2 text-xs ${isRejection ? "text-red-600" : "text-ec-text-muted"}`}
            >
              {actorRole}
              {toStatus &&
                ` -> ${STATUS_LABEL[toStatus as ShipmentStatus] || toStatus}`}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

function ShipmentDetailPanel({
  detail,
  token,
  uploading,
  refreshing,
  onRefresh,
  onUpload,
}: {
  detail: ShipmentDetail | null;
  token: string;
  uploading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  onUpload: (shipmentID: string, formData: FormData) => Promise<void>;
}) {
  if (!detail) {
    return (
      <div className="ec-card rounded-lg">
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <Route size={36} className="text-ec-text-muted" aria-hidden />
          <h2 className="mt-4 text-lg font-bold text-ec-text">
            Select a shipment
          </h2>
          <p className="mt-2 max-w-md text-sm text-ec-text-secondary">
            Open a shipment to view document status, cargo details, and audit
            timeline.
          </p>
        </div>
      </div>
    );
  }

  const { shipment, documents, seller_documents, events } = detail;
  const showSellerDocuments = seller_documents && seller_documents.length > 0;

  return (
    <div className="space-y-5">
      <section className="ec-card rounded-lg">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase text-ec-text-muted">
              Shipment {shortID(shipment.id)}
            </p>
            <h2 className="mt-1 flex flex-wrap items-center gap-2 text-xl font-bold text-ec-text">
              {shipment.origin_port}
              <ArrowRight size={18} aria-hidden />
              {shipment.destination_port}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <ShipmentStatusBadge status={shipment.status} />
            <button
              type="button"
              onClick={onRefresh}
              disabled={refreshing}
              className="ec-btn-ghost border border-ec-border bg-ec-card"
            >
              {refreshing ? (
                <Spinner size="sm" label="Refreshing shipment" />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
              Refresh
            </button>
          </div>
        </div>

        <div className="mt-5 grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
            <p className="text-xs font-semibold uppercase text-ec-text-muted">
              Cargo
            </p>
            <p className="mt-1 font-semibold text-ec-text">
              {shipment.cargo_type}
            </p>
          </div>
          <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
            <p className="text-xs font-semibold uppercase text-ec-text-muted">
              Weight
            </p>
            <p className="mt-1 font-semibold text-ec-text">
              {shipment.weight_kg} kg
            </p>
          </div>
          <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
            <p className="text-xs font-semibold uppercase text-ec-text-muted">
              Volume
            </p>
            <p className="mt-1 font-semibold text-ec-text">
              {shipment.volume_cbm ? `${shipment.volume_cbm} cbm` : "Not set"}
            </p>
          </div>
          <div className="rounded-lg border border-ec-border bg-ec-surface-raised p-3">
            <p className="text-xs font-semibold uppercase text-ec-text-muted">
              Created
            </p>
            <p className="mt-1 font-semibold text-ec-text">
              {formatDate(shipment.created_at)}
            </p>
          </div>
        </div>

        <div className="mt-5">
          <ProgressSteps status={shipment.status} />
        </div>
      </section>

      {(shipment.status === "INITIATED" ||
        shipment.status === "DOCS_UPLOADED" ||
        shipment.status === "REJECTED" ||
        shipment.status === "PENDING_VERIFICATION") && (
        <DocumentUploadForm
          shipmentID={shipment.id}
          busy={uploading}
          onUpload={onUpload}
        />
      )}

      <section className="ec-card rounded-lg">
        <div className="mb-4 flex items-center gap-2">
          <FileText size={18} className="text-ec-accent" aria-hidden />
          <h3 className="font-bold text-ec-text">Documents</h3>
        </div>
        <DocumentsList
          shipmentID={shipment.id}
          documents={documents}
          token={token}
          downloadUrl={shipmentDocumentDownloadUrl}
        />
      </section>

      {showSellerDocuments && (
        <section className="ec-card rounded-lg">
          <div className="mb-4 flex items-center gap-2">
            <FileText size={18} className="text-ec-accent" aria-hidden />
            <h3 className="font-bold text-ec-text">
              Seller uploaded documents
            </h3>
          </div>
          <DocumentsList
            shipmentID={shipment.id}
            documents={seller_documents}
            token={token}
            downloadUrl={sellerShipmentDocumentDownloadUrl}
          />
        </section>
      )}

      <section className="ec-card rounded-lg">
        <div className="mb-4 flex items-center gap-2">
          <ClipboardList size={18} className="text-ec-accent" aria-hidden />
          <h3 className="font-bold text-ec-text">Audit timeline</h3>
        </div>
        <Timeline events={events} />
      </section>
    </div>
  );
}

export function ImporterWorkspace() {
  const { toast } = useToast();
  const [token, setToken] = useState("");
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [selectedID, setSelectedID] = useState<string | null>(null);
  const [detail, setDetail] = useState<ShipmentDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const selectedShipment = useMemo(
    () => shipments.find((s) => s.id === selectedID) ?? null,
    [shipments, selectedID],
  );

  async function loadShipments(authToken = token) {
    if (!authToken) return;
    const items = await listImporterShipments(authToken);
    setShipments(items);
    setSelectedID((prev) => prev ?? items[0]?.id ?? null);
  }

  const loadDetail = useCallback(
    async (shipmentID: string, authToken = token) => {
      if (!authToken) return;
      setDetailLoading(true);
      try {
        const next = await getImporterShipment(authToken, shipmentID);
        setDetail(next);
      } finally {
        setDetailLoading(false);
      }
    },
    [token],
  );

  useEffect(() => {
    const t = getStoredToken();
    if (!t) {
      setLoading(false);
      return;
    }
    setToken(t);
    setLoading(true);
    listImporterShipments(t)
      .then((items) => {
        setShipments(items);
        setSelectedID(items[0]?.id ?? null);
      })
      .catch((err) => toast(errorMessage(err), "error"))
      .finally(() => setLoading(false));
  }, [toast]);

  useEffect(() => {
    if (!token || !selectedID) {
      setDetail(null);
      return;
    }
    loadDetail(selectedID, token).catch((err) =>
      toast(errorMessage(err), "error"),
    );
  }, [loadDetail, selectedID, token, toast]);

  useEffect(() => {
    if (!token || !selectedID) return;
    const interval = window.setInterval(() => {
      getImporterShipment(token, selectedID)
        .then(setDetail)
        .catch(() => {
          /* keep current detail during background refresh */
        });
    }, 15000);
    return () => window.clearInterval(interval);
  }, [selectedID, token]);

  async function handleCreate(payload: CreateShipmentPayload) {
    if (!token) return;
    setCreating(true);
    try {
      const created = await createImporterShipment(token, payload);
      toast("Shipment created.", "success");
      await loadShipments(token);
      setSelectedID(created.id);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setCreating(false);
    }
  }

  async function handleUpload(shipmentID: string, formData: FormData) {
    if (!token) return;
    setUploading(true);
    try {
      const next = await uploadShipmentDocuments(token, shipmentID, formData);
      setDetail(next);
      await loadShipments(token);
      toast("Documents uploaded.", "success");
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setUploading(false);
    }
  }

  async function handleRefresh() {
    if (!token) return;
    setRefreshing(true);
    try {
      await loadShipments(token);
      if (selectedID) await loadDetail(selectedID, token);
    } catch (err) {
      toast(errorMessage(err), "error");
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <main className="mx-auto grid w-full max-w-6xl flex-1 gap-6 px-4 py-8 md:px-8 lg:grid-cols-[minmax(320px,0.9fr)_minmax(0,1.35fr)]">
      <div className="space-y-5">
        <CreateShipmentForm busy={creating} onCreate={handleCreate} />

        <section className="ec-card rounded-lg">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-ec-text">Your shipments</h2>
              <p className="mt-1 text-sm text-ec-text-secondary">
                Track current status and open shipment details.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefresh}
              disabled={refreshing}
              className="ec-btn-ghost border border-ec-border bg-ec-card"
              aria-label="Refresh shipments"
            >
              {refreshing ? (
                <Spinner size="sm" label="Refreshing shipments" />
              ) : (
                <RefreshCw size={16} aria-hidden />
              )}
            </button>
          </div>

          <div className="mt-5">
            {loading ? (
              <ShipmentSkeleton />
            ) : !shipments || shipments.length === 0 ? (
              <div className="rounded-lg border border-dashed border-ec-border bg-ec-surface-raised p-6 text-center">
                <MapPin
                  size={32}
                  className="mx-auto text-ec-text-muted"
                  aria-hidden
                />
                <h3 className="mt-3 font-bold text-ec-text">
                  No shipments yet
                </h3>
                <p className="mt-1 text-sm text-ec-text-secondary">
                  Create your first shipment to begin the document workflow.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {shipments.map((shipment) => (
                  <ShipmentCard
                    key={shipment.id}
                    shipment={shipment}
                    selected={shipment.id === selectedShipment?.id}
                    onSelect={() => setSelectedID(shipment.id)}
                  />
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {detailLoading && !detail ? (
        <div className="ec-card rounded-lg">
          <div className="flex min-h-72 items-center justify-center">
            <Spinner size="lg" label="Loading shipment detail" />
          </div>
        </div>
      ) : (
        <ShipmentDetailPanel
          detail={detail}
          token={token}
          uploading={uploading}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          onUpload={handleUpload}
        />
      )}
    </main>
  );
}
