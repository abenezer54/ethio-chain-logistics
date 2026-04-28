import { API_BASE, apiFetch } from "@/lib/api";
import type {
  DocumentVerificationStatus,
  Shipment,
  ShipmentEvent,
} from "@/lib/shipments";

export type CustomsDocumentCheck = {
  id: string;
  shipment_id: string;
  source: "IMPORTER" | "SELLER";
  doc_type: string;
  original_file_name: string;
  content_type: string;
  size_bytes: number;
  sha256_hash: string;
  verification_status?: DocumentVerificationStatus;
  hash_matches: boolean;
  hash_status: string;
  uploaded_at: string;
};

export type CustomsShipmentDetail = {
  shipment: Shipment;
  documents: CustomsDocumentCheck[];
  events: ShipmentEvent[];
  release_ready: boolean;
};

export async function listCustomsArrivedShipments(
  token: string,
): Promise<Shipment[]> {
  const res = await apiFetch<{ items?: Shipment[] | null }>(
    "/api/v1/customs/shipments/arrived",
    { token },
  );
  return Array.isArray(res.items) ? res.items : [];
}

export async function getCustomsShipment(
  token: string,
  shipmentID: string,
): Promise<CustomsShipmentDetail> {
  const detail = await apiFetch<CustomsShipmentDetail>(
    `/api/v1/customs/shipments/${shipmentID}`,
    { token },
  );
  return {
    ...detail,
    documents: Array.isArray(detail.documents) ? detail.documents : [],
    events: Array.isArray(detail.events) ? detail.events : [],
  };
}

export async function grantCustomsRelease(
  token: string,
  shipmentID: string,
): Promise<CustomsShipmentDetail> {
  const detail = await apiFetch<CustomsShipmentDetail>(
    `/api/v1/customs/shipments/${shipmentID}/release`,
    {
      method: "POST",
      token,
    },
  );
  return {
    ...detail,
    documents: Array.isArray(detail.documents) ? detail.documents : [],
    events: Array.isArray(detail.events) ? detail.events : [],
  };
}

export async function fetchClearanceCertificate(
  token: string,
  shipmentID: string,
): Promise<Blob> {
  const res = await fetch(
    `${API_BASE}/api/v1/customs/shipments/${shipmentID}/certificate`,
    {
      headers: { Authorization: `Bearer ${token}` },
    },
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(text || `Request failed (${res.status})`);
  }
  return res.blob();
}
