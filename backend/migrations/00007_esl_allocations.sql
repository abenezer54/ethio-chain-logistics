-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS transport_slots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transport_type TEXT NOT NULL CHECK (transport_type IN ('SHIP', 'TRUCK')),
  name TEXT NOT NULL,
  reference_code TEXT NOT NULL UNIQUE,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  capacity_kg NUMERIC(12,3) NOT NULL CHECK (capacity_kg > 0),
  remaining_capacity_kg NUMERIC(12,3) NOT NULL CHECK (remaining_capacity_kg >= 0),
  capacity_cbm NUMERIC(12,3) CHECK (capacity_cbm IS NULL OR capacity_cbm > 0),
  remaining_capacity_cbm NUMERIC(12,3) CHECK (remaining_capacity_cbm IS NULL OR remaining_capacity_cbm >= 0),
  available_from TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE' CHECK (status IN ('AVAILABLE', 'BOOKED', 'MAINTENANCE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transport_slots_status_available_from
  ON transport_slots(status, available_from);

CREATE TABLE IF NOT EXISTS shipment_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  transport_slot_id UUID NOT NULL REFERENCES transport_slots(id) ON DELETE RESTRICT,
  leg_type TEXT NOT NULL CHECK (leg_type IN ('SEA', 'INLAND')),
  esl_agent_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  expected_departure_at TIMESTAMPTZ NOT NULL,
  notes TEXT,
  confirmed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_allocations_slot_id
  ON shipment_allocations(transport_slot_id);
CREATE INDEX IF NOT EXISTS idx_shipment_allocations_esl_agent_id
  ON shipment_allocations(esl_agent_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_allocations_shipment_leg
  ON shipment_allocations(shipment_id, leg_type);

INSERT INTO transport_slots (
  transport_type, name, reference_code,
  origin, destination,
  capacity_kg, remaining_capacity_kg,
  capacity_cbm, remaining_capacity_cbm,
  available_from, status
)
VALUES
  ('SHIP', 'MV Red Sea Gate', 'SHIP-RSG-001', 'Shanghai Port', 'Djibouti Port', 24000000, 24000000, 42000, 42000, now() + interval '3 days', 'AVAILABLE'),
  ('SHIP', 'MV Awash Express', 'SHIP-AWE-002', 'Jebel Ali Port', 'Djibouti Port', 18000000, 18000000, 31000, 31000, now() + interval '6 days', 'AVAILABLE'),
  ('TRUCK', 'Ethio Freight Truck 18', 'TRUCK-EFT-018', 'Djibouti Port', 'Modjo Dry Port', 28000, 28000, 76, 76, now() + interval '1 day', 'AVAILABLE'),
  ('TRUCK', 'Addis Corridor Truck 07', 'TRUCK-ACT-007', 'Modjo Dry Port', 'Addis Ababa Hub', 26000, 26000, 72, 72, now() + interval '2 days', 'AVAILABLE'),
  ('TRUCK', 'Dry Port Transfer Truck 24', 'TRUCK-DPT-024', 'Djibouti Port', 'Modjo Dry Port', 30000, 30000, 80, 80, now() + interval '3 days', 'AVAILABLE')
ON CONFLICT (reference_code) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS shipment_allocations;
DROP TABLE IF EXISTS transport_slots;
-- +goose StatementEnd
