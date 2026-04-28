package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/jackc/pgx/v5"
)

type ESLRepo struct {
	pool *Pool
}

func NewESLRepo(pool *Pool) *ESLRepo {
	return &ESLRepo{pool: pool}
}

func (r *ESLRepo) ListVerifiedShipments(ctx context.Context, limit int) ([]domain.Shipment, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	const q = `
SELECT
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
FROM shipments s
WHERE s.status = 'VERIFIED'
  AND NOT EXISTS (
    SELECT 1 FROM shipment_allocations a WHERE a.shipment_id = s.id
  )
ORDER BY updated_at ASC
LIMIT $1
`
	rows, err := r.pool.inner.Query(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("list verified shipments for allocation: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Shipment, 0, limit)
	for rows.Next() {
		s, err := scanShipment(rows)
		if err != nil {
			return nil, fmt.Errorf("scan verified shipment: %w", err)
		}
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate verified shipments: %w", err)
	}
	return out, nil
}

func (r *ESLRepo) ListAvailableTransportSlots(ctx context.Context, limit int) ([]domain.TransportSlot, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	const q = `
SELECT
  id, transport_type, name, reference_code,
  origin, destination,
  capacity_kg::text, remaining_capacity_kg::text,
  COALESCE(capacity_cbm::text, ''), COALESCE(remaining_capacity_cbm::text, ''),
  available_from, status,
  created_at, updated_at
FROM transport_slots
WHERE status = 'AVAILABLE'
  AND transport_type IN ('SHIP', 'TRUCK')
  AND remaining_capacity_kg > 0
ORDER BY available_from ASC, transport_type ASC, name ASC
LIMIT $1
`
	rows, err := r.pool.inner.Query(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("list transport slots: %w", err)
	}
	defer rows.Close()

	out := make([]domain.TransportSlot, 0, limit)
	for rows.Next() {
		slot, err := scanTransportSlot(rows)
		if err != nil {
			return nil, fmt.Errorf("scan transport slot: %w", err)
		}
		out = append(out, slot)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate transport slots: %w", err)
	}
	return out, nil
}

func (r *ESLRepo) AllocateShipment(ctx context.Context, eslAgentID, shipmentID, shipSlotID, truckSlotID string, expectedDepartureAt time.Time, notes string) (domain.ShipmentAllocationDetail, error) {
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return domain.ShipmentAllocationDetail{}, fmt.Errorf("begin allocation: %w", err)
	}
	defer tx.Rollback(ctx)

	const shipmentQ = `
SELECT
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
FROM shipments
WHERE id = $1
FOR UPDATE
`
	shipment, err := scanShipment(tx.QueryRow(ctx, shipmentQ, shipmentID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ShipmentAllocationDetail{}, domain.ErrNotFound
		}
		return domain.ShipmentAllocationDetail{}, fmt.Errorf("lock shipment for allocation: %w", err)
	}
	if shipment.Status != domain.ShipmentStatusVerified {
		return domain.ShipmentAllocationDetail{}, fmt.Errorf("%w: shipment must be VERIFIED before allocation", domain.ErrValidation)
	}

	shipSlot, err := r.consumeSlotCapacity(ctx, tx, shipSlotID, domain.TransportTypeShip, shipment)
	if err != nil {
		return domain.ShipmentAllocationDetail{}, err
	}
	truckSlot, err := r.consumeSlotCapacity(ctx, tx, truckSlotID, domain.TransportTypeTruck, shipment)
	if err != nil {
		return domain.ShipmentAllocationDetail{}, err
	}
	seaAllocation, err := r.insertAllocation(ctx, tx, shipmentID, shipSlotID, "SEA", eslAgentID, expectedDepartureAt, notes)
	if err != nil {
		return domain.ShipmentAllocationDetail{}, err
	}
	inlandAllocation, err := r.insertAllocation(ctx, tx, shipmentID, truckSlotID, "INLAND", eslAgentID, expectedDepartureAt, notes)
	if err != nil {
		return domain.ShipmentAllocationDetail{}, err
	}
	allocations := []domain.ShipmentAllocation{seaAllocation, inlandAllocation}

	const updateShipmentQ = `
UPDATE shipments
SET status = 'ALLOCATED', updated_at = now()
WHERE id = $1
RETURNING
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
`
	allocatedShipment, err := scanShipment(tx.QueryRow(ctx, updateShipmentQ, shipmentID))
	if err != nil {
		return domain.ShipmentAllocationDetail{}, fmt.Errorf("mark shipment allocated: %w", err)
	}

	shipmentRepo := &ShipmentRepo{pool: r.pool}
	if _, err := shipmentRepo.appendEvent(ctx, tx, shipmentEventInput{
		ShipmentID: shipmentID,
		ActorID:    eslAgentID,
		ActorRole:  domain.RoleESLAgent,
		Action:     "SHIPMENT_ALLOCATED",
		FromStatus: domain.ShipmentStatusVerified,
		ToStatus:   domain.ShipmentStatusAllocated,
		Message:    "ESL agent allocated transport for the shipment.",
		Metadata: map[string]any{
			"shipment_weight_kg":          shipment.WeightKG,
			"ship_slot_id":                shipSlot.ID,
			"ship_name":                   shipSlot.Name,
			"ship_reference_code":         shipSlot.ReferenceCode,
			"ship_remaining_capacity_kg":  shipSlot.RemainingCapacityKG,
			"truck_slot_id":               truckSlot.ID,
			"truck_name":                  truckSlot.Name,
			"truck_reference_code":        truckSlot.ReferenceCode,
			"truck_remaining_capacity_kg": truckSlot.RemainingCapacityKG,
			"expected_departure_at":       expectedDepartureAt,
			"allocation_notes_available":  notes != "",
		},
	}); err != nil {
		return domain.ShipmentAllocationDetail{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.ShipmentAllocationDetail{}, fmt.Errorf("commit allocation: %w", err)
	}

	return domain.ShipmentAllocationDetail{
		Allocations: allocations,
		Shipment:    allocatedShipment,
		Slots:       []domain.TransportSlot{shipSlot, truckSlot},
	}, nil
}

func (r *ESLRepo) consumeSlotCapacity(ctx context.Context, tx pgx.Tx, slotID string, transportType domain.TransportType, shipment domain.Shipment) (domain.TransportSlot, error) {
	const q = `
UPDATE transport_slots
SET
  remaining_capacity_kg = remaining_capacity_kg - $3::numeric,
  remaining_capacity_cbm = CASE
    WHEN remaining_capacity_cbm IS NULL OR NULLIF($4, '') IS NULL THEN remaining_capacity_cbm
    ELSE remaining_capacity_cbm - NULLIF($4, '')::numeric
  END,
  status = CASE
    WHEN remaining_capacity_kg - $3::numeric <= 0
      OR (
        remaining_capacity_cbm IS NOT NULL
        AND NULLIF($4, '') IS NOT NULL
        AND remaining_capacity_cbm - NULLIF($4, '')::numeric <= 0
      )
    THEN 'BOOKED'
    ELSE status
  END,
  updated_at = now()
WHERE id = $1
  AND transport_type = $2
  AND status = 'AVAILABLE'
  AND remaining_capacity_kg >= $3::numeric
  AND (
    remaining_capacity_cbm IS NULL
    OR NULLIF($4, '') IS NULL
    OR remaining_capacity_cbm >= NULLIF($4, '')::numeric
  )
RETURNING
  id, transport_type, name, reference_code,
  origin, destination,
  capacity_kg::text, remaining_capacity_kg::text,
  COALESCE(capacity_cbm::text, ''), COALESCE(remaining_capacity_cbm::text, ''),
  available_from, status,
  created_at, updated_at
`
	slot, err := scanTransportSlot(tx.QueryRow(ctx, q, slotID, string(transportType), shipment.WeightKG, shipment.VolumeCBM))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.TransportSlot{}, fmt.Errorf("%w: %s slot is unavailable or does not have enough remaining capacity", domain.ErrValidation, transportType)
		}
		return domain.TransportSlot{}, fmt.Errorf("consume %s slot capacity: %w", transportType, err)
	}
	return slot, nil
}

func (r *ESLRepo) insertAllocation(ctx context.Context, tx pgx.Tx, shipmentID, slotID, legType, eslAgentID string, expectedDepartureAt time.Time, notes string) (domain.ShipmentAllocation, error) {
	const q = `
INSERT INTO shipment_allocations (
  shipment_id, transport_slot_id, leg_type, esl_agent_id,
  expected_departure_at, notes
)
VALUES ($1,$2,$3,$4,$5,NULLIF($6, ''))
RETURNING id, shipment_id, transport_slot_id, leg_type, esl_agent_id,
  expected_departure_at, COALESCE(notes, ''),
  confirmed_at, created_at
`
	allocation, err := scanAllocation(tx.QueryRow(ctx, q,
		shipmentID, slotID, legType, eslAgentID,
		expectedDepartureAt, notes,
	))
	if err != nil {
		return domain.ShipmentAllocation{}, fmt.Errorf("create %s shipment allocation: %w", legType, err)
	}
	return allocation, nil
}

func scanTransportSlot(row rowScanner) (domain.TransportSlot, error) {
	var slot domain.TransportSlot
	var transportType, status string
	if err := row.Scan(
		&slot.ID, &transportType, &slot.Name, &slot.ReferenceCode,
		&slot.Origin, &slot.Destination,
		&slot.CapacityKG, &slot.RemainingCapacityKG,
		&slot.CapacityCBM, &slot.RemainingCapacityCBM,
		&slot.AvailableFrom, &status,
		&slot.CreatedAt, &slot.UpdatedAt,
	); err != nil {
		return domain.TransportSlot{}, err
	}
	slot.TransportType = domain.TransportType(transportType)
	slot.Status = domain.TransportSlotStatus(status)
	return slot, nil
}

func scanAllocation(row rowScanner) (domain.ShipmentAllocation, error) {
	var allocation domain.ShipmentAllocation
	if err := row.Scan(
		&allocation.ID, &allocation.ShipmentID, &allocation.TransportSlotID,
		&allocation.LegType, &allocation.ESLAgentID, &allocation.ExpectedDepartureAt,
		&allocation.Notes, &allocation.ConfirmedAt, &allocation.CreatedAt,
	); err != nil {
		return domain.ShipmentAllocation{}, err
	}
	return allocation, nil
}
