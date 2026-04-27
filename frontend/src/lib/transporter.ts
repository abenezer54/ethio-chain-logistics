import { apiFetch } from "@/lib/api";
import type { Shipment, ShipmentEvent } from "@/lib/shipments";
import type { ShipmentAllocation, TransportSlot } from "@/lib/esl";

export type TransportMilestone =
  | "DEPARTED_ORIGIN_PORT"
  | "ARRIVED_DJIBOUTI_PORT"
  | "IN_TRANSIT_BY_LAND"
  | "ARRIVED_DRY_PORT";

export type TransporterShipment = {
  shipment: Shipment;
  transport_slot: TransportSlot;
  allocation: ShipmentAllocation;
  events?: ShipmentEvent[];
};

export async function listAssignedTransporterShipments(
  token: string,
): Promise<TransporterShipment[]> {
  const res = await apiFetch<{ items?: TransporterShipment[] | null }>(
    "/api/v1/transporter/shipments",
    { token },
  );
  return Array.isArray(res.items) ? res.items : [];
}

export async function getTransporterShipment(
  token: string,
  shipmentID: string,
  allocationID: string,
): Promise<TransporterShipment> {
  const query = allocationID
    ? `?allocation_id=${encodeURIComponent(allocationID)}`
    : "";
  const item = await apiFetch<TransporterShipment>(
    `/api/v1/transporter/shipments/${shipmentID}${query}`,
    { token },
  );
  return { ...item, events: Array.isArray(item.events) ? item.events : [] };
}

export function addTransportMilestone(
  token: string,
  shipmentID: string,
  payload: {
    allocation_id: string;
    milestone: TransportMilestone;
    latitude?: string;
    longitude?: string;
    location_note?: string;
  },
): Promise<TransporterShipment> {
  return apiFetch<TransporterShipment>(
    `/api/v1/transporter/shipments/${shipmentID}/milestones`,
    {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
