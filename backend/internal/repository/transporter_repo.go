package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/abenezer54/ethio-chain-logistics/backend/internal/usecase"
	"github.com/jackc/pgx/v5"
)

type TransporterRepo struct {
	pool *Pool
}

func NewTransporterRepo(pool *Pool) *TransporterRepo {
	return &TransporterRepo{pool: pool}
}

func (r *TransporterRepo) ListAssignedShipments(ctx context.Context, transporterID string, limit int) ([]domain.TransporterShipment, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	const q = `
SELECT
  s.id, s.importer_id, s.seller_id,
  s.origin_port, s.destination_port, s.cargo_type,
  s.weight_kg::text, COALESCE(s.volume_cbm::text, ''),
  s.status, s.anchor_status, COALESCE(s.blockchain_tx_hash, ''),
  s.created_at, s.updated_at,
  ts.id, ts.transport_type, ts.name, ts.reference_code,
  ts.origin, ts.destination,
  ts.capacity_kg::text, ts.remaining_capacity_kg::text,
  COALESCE(ts.capacity_cbm::text, ''), COALESCE(ts.remaining_capacity_cbm::text, ''),
  ts.available_from, ts.status,
  ts.created_at, ts.updated_at,
  a.id, a.shipment_id, a.transport_slot_id, a.leg_type, a.esl_agent_id,
  a.expected_departure_at, COALESCE(a.notes, ''),
  a.confirmed_at, a.created_at
FROM shipments s
JOIN shipment_allocations a ON a.shipment_id = s.id
JOIN transport_slots ts ON ts.id = a.transport_slot_id
JOIN users u ON u.id = $1
WHERE u.role = 'TRANSPORTER'
  AND s.status IN ('ALLOCATED', 'IN_TRANSIT', 'ARRIVED', 'AT_CUSTOMS')
  AND (
    lower(COALESCE(u.truck_id, '')) = lower(ts.reference_code)
    OR lower(COALESCE(u.truck_id, '')) = lower(ts.name)
    OR (
      COALESCE(u.carrier_company, '') <> ''
      AND lower(ts.name) LIKE '%' || lower(u.carrier_company) || '%'
    )
  )
ORDER BY s.updated_at DESC, a.leg_type, a.created_at
LIMIT $2
`
	rows, err := r.pool.inner.Query(ctx, q, transporterID, limit)
	if err != nil {
		return nil, fmt.Errorf("list transporter shipments: %w", err)
	}
	defer rows.Close()

	out := make([]domain.TransporterShipment, 0, limit)
	for rows.Next() {
		item, err := scanTransporterShipment(rows)
		if err != nil {
			return nil, fmt.Errorf("scan transporter shipment: %w", err)
		}
		out = append(out, item)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate transporter shipments: %w", err)
	}
	return out, nil
}

func (r *TransporterRepo) GetAssignedShipment(ctx context.Context, transporterID, shipmentID, allocationID string) (domain.TransporterShipment, error) {
	item, err := r.getAssignedShipment(ctx, r.pool.inner, transporterID, shipmentID, allocationID, false)
	if err != nil {
		return domain.TransporterShipment{}, err
	}
	events, err := (&ShipmentRepo{pool: r.pool}).listEvents(ctx, shipmentID)
	if err != nil {
		return domain.TransporterShipment{}, err
	}
	item.Events = events
	return item, nil
}

func (r *TransporterRepo) AddMilestone(ctx context.Context, req usecase.AddTransportMilestoneRequest) (domain.TransporterShipment, error) {
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return domain.TransporterShipment{}, fmt.Errorf("begin transport milestone: %w", err)
	}
	defer tx.Rollback(ctx)

	item, err := r.getAssignedShipment(ctx, tx, req.TransporterID, req.ShipmentID, req.AllocationID, true)
	if err != nil {
		return domain.TransporterShipment{}, err
	}

	nextStatus, action, message, err := milestoneTransition(item.Shipment.Status, item.Allocation.LegType, req.Milestone)
	if err != nil {
		return domain.TransporterShipment{}, err
	}
	originalStatus := item.Shipment.Status

	const updateQ = `
UPDATE shipments
SET status = $2, updated_at = now()
WHERE id = $1
RETURNING
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
`
	updatedShipment, err := scanShipment(tx.QueryRow(ctx, updateQ, req.ShipmentID, nextStatus))
	if err != nil {
		return domain.TransporterShipment{}, fmt.Errorf("update shipment milestone status: %w", err)
	}

	metadata := map[string]any{
		"milestone":                req.Milestone,
		"allocation_id":            item.Allocation.ID,
		"leg_type":                 item.Allocation.LegType,
		"transport_slot_id":        item.TransportSlot.ID,
		"transport_reference_code": item.TransportSlot.ReferenceCode,
	}
	if req.Latitude != "" && req.Longitude != "" {
		metadata["latitude"] = req.Latitude
		metadata["longitude"] = req.Longitude
	}
	if req.LocationNote != "" {
		metadata["location_note"] = req.LocationNote
	}

	if _, err := (&ShipmentRepo{pool: r.pool}).appendEvent(ctx, tx, shipmentEventInput{
		ShipmentID: req.ShipmentID,
		ActorID:    req.TransporterID,
		ActorRole:  domain.RoleTransporter,
		Action:     action,
		FromStatus: originalStatus,
		ToStatus:   nextStatus,
		Message:    message,
		Metadata:   metadata,
	}); err != nil {
		return domain.TransporterShipment{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.TransporterShipment{}, fmt.Errorf("commit transport milestone: %w", err)
	}

	out, err := r.GetAssignedShipment(ctx, req.TransporterID, req.ShipmentID, req.AllocationID)
	if err != nil {
		return domain.TransporterShipment{}, err
	}
	out.Shipment = updatedShipment
	return out, nil
}

type assignedShipmentScanner interface {
	QueryRow(ctx context.Context, sql string, args ...any) pgx.Row
}

func (r *TransporterRepo) getAssignedShipment(ctx context.Context, db assignedShipmentScanner, transporterID, shipmentID, allocationID string, forUpdate bool) (domain.TransporterShipment, error) {
	tail := `
ORDER BY CASE WHEN a.leg_type = 'SEA' THEN 0 ELSE 1 END, a.created_at
LIMIT 1`
	if forUpdate {
		tail += " FOR UPDATE OF s"
	}
	q := `
SELECT
  s.id, s.importer_id, s.seller_id,
  s.origin_port, s.destination_port, s.cargo_type,
  s.weight_kg::text, COALESCE(s.volume_cbm::text, ''),
  s.status, s.anchor_status, COALESCE(s.blockchain_tx_hash, ''),
  s.created_at, s.updated_at,
  ts.id, ts.transport_type, ts.name, ts.reference_code,
  ts.origin, ts.destination,
  ts.capacity_kg::text, ts.remaining_capacity_kg::text,
  COALESCE(ts.capacity_cbm::text, ''), COALESCE(ts.remaining_capacity_cbm::text, ''),
  ts.available_from, ts.status,
  ts.created_at, ts.updated_at,
  a.id, a.shipment_id, a.transport_slot_id, a.leg_type, a.esl_agent_id,
  a.expected_departure_at, COALESCE(a.notes, ''),
  a.confirmed_at, a.created_at
FROM shipments s
JOIN shipment_allocations a ON a.shipment_id = s.id
JOIN transport_slots ts ON ts.id = a.transport_slot_id
JOIN users u ON u.id = $1
WHERE s.id = $2
  AND ($3 = '' OR a.id::text = $3)
  AND u.role = 'TRANSPORTER'
  AND s.status IN ('ALLOCATED', 'IN_TRANSIT', 'ARRIVED', 'AT_CUSTOMS')
  AND (
    lower(COALESCE(u.truck_id, '')) = lower(ts.reference_code)
    OR lower(COALESCE(u.truck_id, '')) = lower(ts.name)
    OR (
      COALESCE(u.carrier_company, '') <> ''
      AND lower(ts.name) LIKE '%' || lower(u.carrier_company) || '%'
    )
  )` + tail
	item, err := scanTransporterShipment(db.QueryRow(ctx, q, transporterID, shipmentID, allocationID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.TransporterShipment{}, domain.ErrNotFound
		}
		return domain.TransporterShipment{}, fmt.Errorf("get assigned transporter shipment: %w", err)
	}
	return item, nil
}

func milestoneTransition(current domain.ShipmentStatus, legType string, milestone domain.TransportMilestone) (domain.ShipmentStatus, string, string, error) {
	if current == domain.ShipmentStatusCleared {
		return "", "", "", fmt.Errorf("%w: cleared shipments cannot be updated", domain.ErrValidation)
	}

	switch milestone {
	case domain.TransportMilestoneDepartedOrigin:
		if legType != "SEA" {
			return "", "", "", fmt.Errorf("%w: departure from origin port belongs to the sea leg", domain.ErrValidation)
		}
		if current != domain.ShipmentStatusAllocated && current != domain.ShipmentStatusInTransit {
			return "", "", "", fmt.Errorf("%w: shipment must be allocated before departure", domain.ErrValidation)
		}
		return domain.ShipmentStatusInTransit, "TRANSPORT_DEPARTED_ORIGIN_PORT", "Sea carrier departed from the origin port.", nil
	case domain.TransportMilestoneArrivedDjibouti:
		if legType != "SEA" {
			return "", "", "", fmt.Errorf("%w: Djibouti port arrival belongs to the sea leg", domain.ErrValidation)
		}
		if current != domain.ShipmentStatusInTransit {
			return "", "", "", fmt.Errorf("%w: shipment must be in transit before Djibouti arrival", domain.ErrValidation)
		}
		return domain.ShipmentStatusInTransit, "TRANSPORT_ARRIVED_DJIBOUTI_PORT", "Shipment arrived at Djibouti port by sea.", nil
	case domain.TransportMilestoneInTransitLand:
		if legType != "INLAND" {
			return "", "", "", fmt.Errorf("%w: land movement belongs to the inland truck leg", domain.ErrValidation)
		}
		if current != domain.ShipmentStatusInTransit && current != domain.ShipmentStatusAllocated {
			return "", "", "", fmt.Errorf("%w: shipment must be in transit before land movement", domain.ErrValidation)
		}
		return domain.ShipmentStatusInTransit, "TRANSPORT_IN_TRANSIT_BY_LAND", "Shipment is in transit by land.", nil
	case domain.TransportMilestoneArrivedDryPort:
		if legType != "INLAND" {
			return "", "", "", fmt.Errorf("%w: dry port arrival belongs to the inland truck leg", domain.ErrValidation)
		}
		if current != domain.ShipmentStatusInTransit && current != domain.ShipmentStatusAllocated {
			return "", "", "", fmt.Errorf("%w: shipment must be in transit before dry port arrival", domain.ErrValidation)
		}
		return domain.ShipmentStatusArrived, "TRANSPORT_ARRIVED_DRY_PORT", "Shipment arrived at the dry port and is ready for clearance.", nil
	default:
		return "", "", "", fmt.Errorf("%w: invalid milestone", domain.ErrValidation)
	}
}

func scanTransporterShipment(row rowScanner) (domain.TransporterShipment, error) {
	var item domain.TransporterShipment
	shipment, slot, allocation, err := scanShipmentSlotAllocation(row)
	if err != nil {
		return domain.TransporterShipment{}, err
	}
	item.Shipment = shipment
	item.TransportSlot = slot
	item.Allocation = allocation
	return item, nil
}

func scanShipmentSlotAllocation(row rowScanner) (domain.Shipment, domain.TransportSlot, domain.ShipmentAllocation, error) {
	var shipment domain.Shipment
	var sellerID *string
	var shipmentStatus, shipmentAnchorStatus string
	var slot domain.TransportSlot
	var slotTransportType, slotStatus string
	var allocation domain.ShipmentAllocation

	if err := row.Scan(
		&shipment.ID, &shipment.ImporterID, &sellerID,
		&shipment.OriginPort, &shipment.DestinationPort, &shipment.CargoType,
		&shipment.WeightKG, &shipment.VolumeCBM,
		&shipmentStatus, &shipmentAnchorStatus, &shipment.BlockchainTxHash,
		&shipment.CreatedAt, &shipment.UpdatedAt,
		&slot.ID, &slotTransportType, &slot.Name, &slot.ReferenceCode,
		&slot.Origin, &slot.Destination,
		&slot.CapacityKG, &slot.RemainingCapacityKG,
		&slot.CapacityCBM, &slot.RemainingCapacityCBM,
		&slot.AvailableFrom, &slotStatus,
		&slot.CreatedAt, &slot.UpdatedAt,
		&allocation.ID, &allocation.ShipmentID, &allocation.TransportSlotID,
		&allocation.LegType, &allocation.ESLAgentID,
		&allocation.ExpectedDepartureAt, &allocation.Notes,
		&allocation.ConfirmedAt, &allocation.CreatedAt,
	); err != nil {
		return domain.Shipment{}, domain.TransportSlot{}, domain.ShipmentAllocation{}, err
	}

	shipment.SellerID = deref(sellerID)
	shipment.Status = domain.ShipmentStatus(shipmentStatus)
	shipment.AnchorStatus = domain.AnchorStatus(shipmentAnchorStatus)
	slot.TransportType = domain.TransportType(slotTransportType)
	slot.Status = domain.TransportSlotStatus(slotStatus)
	return shipment, slot, allocation, nil
}
