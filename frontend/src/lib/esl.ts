import { apiFetch } from "@/lib/api";
import type { Shipment } from "@/lib/shipments";

export type TransportType = "SHIP" | "TRUCK";
export type TransportSlotStatus = "AVAILABLE" | "BOOKED" | "MAINTENANCE";

export type TransportSlot = {
  id: string;
  transport_type: TransportType;
  name: string;
  reference_code: string;
  origin: string;
  destination: string;
  capacity_kg: string;
  remaining_capacity_kg: string;
  capacity_cbm?: string;
  remaining_capacity_cbm?: string;
  available_from: string;
  status: TransportSlotStatus;
  created_at: string;
  updated_at: string;
};

export type ShipmentAllocation = {
  id: string;
  shipment_id: string;
  transport_slot_id: string;
  leg_type: "SEA" | "INLAND";
  esl_agent_id: string;
  expected_departure_at: string;
  notes?: string;
  confirmed_at: string;
  created_at: string;
};

export type ShipmentAllocationDetail = {
  allocations: ShipmentAllocation[];
  shipment: Shipment;
  slots: TransportSlot[];
};

export async function listVerifiedShipmentsForAllocation(
  token: string,
): Promise<Shipment[]> {
  const res = await apiFetch<{ items?: Shipment[] | null }>(
    "/api/v1/esl/shipments/verified",
    { token },
  );
  return Array.isArray(res.items) ? res.items : [];
}

export async function listAvailableTransportSlots(
  token: string,
): Promise<TransportSlot[]> {
  const res = await apiFetch<{ items?: TransportSlot[] | null }>(
    "/api/v1/esl/transport-slots",
    { token },
  );
  return Array.isArray(res.items) ? res.items : [];
}

export function allocateShipment(
  token: string,
  shipmentID: string,
  payload: {
    ship_slot_id: string;
    truck_slot_id: string;
    expected_departure_date: string;
    notes?: string;
  },
): Promise<ShipmentAllocationDetail> {
  return apiFetch<ShipmentAllocationDetail>(
    `/api/v1/esl/shipments/${shipmentID}/allocate`,
    {
      method: "POST",
      token,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
}
