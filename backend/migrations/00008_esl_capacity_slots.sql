-- +goose Up
-- +goose StatementBegin

ALTER TABLE transport_slots
  ADD COLUMN IF NOT EXISTS remaining_capacity_kg NUMERIC(12,3),
  ADD COLUMN IF NOT EXISTS remaining_capacity_cbm NUMERIC(12,3);

UPDATE transport_slots
SET
  remaining_capacity_kg = COALESCE(remaining_capacity_kg, capacity_kg),
  remaining_capacity_cbm = COALESCE(remaining_capacity_cbm, capacity_cbm)
WHERE remaining_capacity_kg IS NULL
   OR (capacity_cbm IS NOT NULL AND remaining_capacity_cbm IS NULL);

ALTER TABLE transport_slots
  ALTER COLUMN remaining_capacity_kg SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_slots_remaining_capacity_kg_check'
  ) THEN
    ALTER TABLE transport_slots
      ADD CONSTRAINT transport_slots_remaining_capacity_kg_check
      CHECK (remaining_capacity_kg >= 0);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transport_slots_remaining_capacity_cbm_check'
  ) THEN
    ALTER TABLE transport_slots
      ADD CONSTRAINT transport_slots_remaining_capacity_cbm_check
      CHECK (remaining_capacity_cbm IS NULL OR remaining_capacity_cbm >= 0);
  END IF;
END $$;

DELETE FROM transport_slots
WHERE transport_type = 'RAIL'
  AND NOT EXISTS (
    SELECT 1
    FROM shipment_allocations
    WHERE shipment_allocations.transport_slot_id = transport_slots.id
  );

ALTER TABLE shipment_allocations
  ADD COLUMN IF NOT EXISTS leg_type TEXT;

UPDATE shipment_allocations
SET leg_type = COALESCE(leg_type, 'SEA')
WHERE leg_type IS NULL;

ALTER TABLE shipment_allocations
  ALTER COLUMN leg_type SET NOT NULL;

ALTER TABLE shipment_allocations
  DROP CONSTRAINT IF EXISTS shipment_allocations_shipment_id_key;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shipment_allocations_leg_type_check'
  ) THEN
    ALTER TABLE shipment_allocations
      ADD CONSTRAINT shipment_allocations_leg_type_check
      CHECK (leg_type IN ('SEA', 'INLAND'));
  END IF;
END $$;

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
  ('TRUCK', 'Dry Port Transfer Truck 24', 'TRUCK-DPT-024', 'Djibouti Port', 'Modjo Dry Port', 30000, 30000, 80, 80, now() + interval '3 days', 'AVAILABLE'),
  ('SHIP', 'MV Sheger Link', 'SHIP-SGL-003', 'Berbera Port', 'Djibouti Port', 16000000, 16000000, 28000, 28000, now() + interval '7 days', 'AVAILABLE')
ON CONFLICT (reference_code) DO NOTHING;

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_shipment_allocations_shipment_leg;

ALTER TABLE shipment_allocations
  ADD CONSTRAINT shipment_allocations_shipment_id_key UNIQUE (shipment_id);

ALTER TABLE shipment_allocations
  DROP CONSTRAINT IF EXISTS shipment_allocations_leg_type_check,
  DROP COLUMN IF EXISTS leg_type;

ALTER TABLE transport_slots
  DROP CONSTRAINT IF EXISTS transport_slots_remaining_capacity_kg_check,
  DROP CONSTRAINT IF EXISTS transport_slots_remaining_capacity_cbm_check,
  DROP COLUMN IF EXISTS remaining_capacity_kg,
  DROP COLUMN IF EXISTS remaining_capacity_cbm;
-- +goose StatementEnd
