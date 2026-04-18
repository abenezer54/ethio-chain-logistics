import { API_BASE, apiFetch } from "@/lib/api";

export type ShipmentStatus =
  | "INITIATED"
  | "DOCS_UPLOADED"
  | "PENDING_VERIFICATION"
  | "VERIFIED"
  | "APPROVED"
  | "ALLOCATED"
  | "IN_TRANSIT"
  | "ARRIVED"
  | "AT_CUSTOMS"
  | "HELD_FOR_INSPECTION"
  | "CLEARED";

export type AnchorStatus = "PENDING" | "ANCHORED" | "FAILED";

export type ShipmentDocumentType =
  | "BILL_OF_LADING"
  | "COMMERCIAL_INVOICE"
  | "LETTER_OF_CREDIT"
  | "SUPPLEMENTAL";

export type DocumentVerificationStatus =
  | "PENDING"
  | "MATCHED"
  | "MISMATCHED"
  | "REJECTED";

export type Shipment = {
  id: string;
  importer_id: string;
  seller_id?: string;
  origin_port: string;
  destination_port: string;
  cargo_type: string;
  weight_kg: string;
  volume_cbm?: string;
  status: ShipmentStatus;
  anchor_status: AnchorStatus;
  blockchain_tx_hash?: string;
  created_at: string;
  updated_at: string;
};

export type ShipmentDocument = {
  id: string;
  shipment_id: string;
  doc_type: ShipmentDocumentType;
  original_file_name: string;
  content_type: string;
  size_bytes: number;
  storage_key: string;
  sha256_hash: string;
  verification_status: DocumentVerificationStatus;
  uploaded_by: string;
  ipfs_cid?: string;
  anchor_status: AnchorStatus;
  blockchain_tx_hash?: string;
  uploaded_at: string;
};

export type ShipmentEvent = {
  id: string;
  shipment_id: string;
  actor_id?: string;
  actor_role: string;
  action: string;
  from_status?: ShipmentStatus;
  to_status?: ShipmentStatus;
  message?: string;
  metadata?: Record<string, unknown>;
  event_hash: string;
  previous_event_hash?: string;
  anchor_status: AnchorStatus;
  blockchain_tx_hash?: string;
  created_at: string;
};

export type ShipmentDetail = {
  shipment: Shipment;
  documents: ShipmentDocument[];
  events: ShipmentEvent[];
};

type ShipmentDetailResponse = Omit<ShipmentDetail, "documents" | "events"> & {
  documents?: ShipmentDocument[] | null;
  events?: ShipmentEvent[] | null;
};

export type CreateShipmentPayload = {
  seller_id?: string;
  origin_port: string;
  destination_port: string;
  cargo_type: string;
  weight_kg: string;
  volume_cbm?: string;
};

export async function listImporterShipments(token: string): Promise<Shipment[]> {
  const res = await apiFetch<{ items?: Shipment[] | null }>(
    "/api/v1/importer/shipments",
    { token }
  );
  return Array.isArray(res.items) ? res.items : [];
}

export function createImporterShipment(
  token: string,
  payload: CreateShipmentPayload
): Promise<Shipment> {
  return apiFetch<Shipment>("/api/v1/importer/shipments", {
    method: "POST",
    token,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getImporterShipment(
  token: string,
  shipmentID: string
): Promise<ShipmentDetail> {
  const detail = await apiFetch<ShipmentDetailResponse>(
    `/api/v1/importer/shipments/${shipmentID}`,
    { token }
  );
  return normalizeShipmentDetail(detail);
}

export async function uploadShipmentDocuments(
  token: string,
  shipmentID: string,
  body: FormData
): Promise<ShipmentDetail> {
  const detail = await apiFetch<ShipmentDetailResponse>(
    `/api/v1/importer/shipments/${shipmentID}/documents`,
    {
      method: "POST",
      token,
      body,
    }
  );
  return normalizeShipmentDetail(detail);
}

export function shipmentDocumentDownloadUrl(
  shipmentID: string,
  documentID: string
): string {
  return `${API_BASE}/api/v1/importer/shipments/${shipmentID}/documents/${documentID}/download`;
}

function normalizeShipmentDetail(detail: ShipmentDetailResponse): ShipmentDetail {
  return {
    ...detail,
    documents: Array.isArray(detail.documents) ? detail.documents : [],
    events: Array.isArray(detail.events) ? detail.events : [],
  };
}
