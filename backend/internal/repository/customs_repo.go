package repository

import (
	"context"
	"errors"
	"fmt"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/jackc/pgx/v5"
)

type CustomsRepo struct {
	pool *Pool
}

func NewCustomsRepo(pool *Pool) *CustomsRepo {
	return &CustomsRepo{pool: pool}
}

func (r *CustomsRepo) ListAwaitingClearance(ctx context.Context, limit int) ([]domain.Shipment, error) {
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
FROM shipments
WHERE status IN ('ARRIVED', 'AT_CUSTOMS')
ORDER BY updated_at ASC
LIMIT $1
`
	rows, err := r.pool.inner.Query(ctx, q, limit)
	if err != nil {
		return nil, fmt.Errorf("list customs clearance queue: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Shipment, 0, limit)
	for rows.Next() {
		shipment, err := scanShipment(rows)
		if err != nil {
			return nil, fmt.Errorf("scan customs shipment: %w", err)
		}
		out = append(out, shipment)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate customs shipments: %w", err)
	}
	return out, nil
}

func (r *CustomsRepo) GetShipmentDetail(ctx context.Context, shipmentID string) (domain.ShipmentDetail, error) {
	shipment, err := r.getShipment(ctx, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}
	shipmentRepo := &ShipmentRepo{pool: r.pool}
	docs, err := shipmentRepo.listDocuments(ctx, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}
	sellerDocs, err := shipmentRepo.listSellerDocuments(ctx, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}
	events, err := shipmentRepo.listEvents(ctx, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}
	return domain.ShipmentDetail{
		Shipment:        shipment,
		Documents:       docs,
		SellerDocuments: sellerDocs,
		Events:          events,
	}, nil
}

func (r *CustomsRepo) GrantDigitalRelease(ctx context.Context, officerID, shipmentID string) (domain.ShipmentDetail, error) {
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("begin customs release: %w", err)
	}
	defer tx.Rollback(ctx)

	const lockQ = `
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
	current, err := scanShipment(tx.QueryRow(ctx, lockQ, shipmentID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ShipmentDetail{}, domain.ErrNotFound
		}
		return domain.ShipmentDetail{}, fmt.Errorf("lock shipment for customs release: %w", err)
	}
	if current.Status == domain.ShipmentStatusCleared {
		return domain.ShipmentDetail{}, fmt.Errorf("%w: digital release is already granted and cannot be changed", domain.ErrValidation)
	}
	if current.Status != domain.ShipmentStatusArrived && current.Status != domain.ShipmentStatusAtCustoms {
		return domain.ShipmentDetail{}, fmt.Errorf("%w: shipment must be arrived before customs release", domain.ErrValidation)
	}

	const updateQ = `
UPDATE shipments
SET status = 'CLEARED', updated_at = now()
WHERE id = $1
RETURNING
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
`
	updated, err := scanShipment(tx.QueryRow(ctx, updateQ, shipmentID))
	if err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("update customs release status: %w", err)
	}

	if _, err := (&ShipmentRepo{pool: r.pool}).appendEvent(ctx, tx, shipmentEventInput{
		ShipmentID: shipmentID,
		ActorID:    officerID,
		ActorRole:  domain.RoleCustoms,
		Action:     "CUSTOMS_DIGITAL_RELEASE_GRANTED",
		FromStatus: current.Status,
		ToStatus:   domain.ShipmentStatusCleared,
		Message:    "Customs officer granted final digital release.",
		Metadata: map[string]any{
			"irreversible": true,
		},
	}); err != nil {
		return domain.ShipmentDetail{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("commit customs release: %w", err)
	}

	detail, err := r.GetShipmentDetail(ctx, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}
	detail.Shipment = updated
	return detail, nil
}

func (r *CustomsRepo) getShipment(ctx context.Context, shipmentID string) (domain.Shipment, error) {
	const q = `
SELECT
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
FROM shipments
WHERE id = $1
`
	shipment, err := scanShipment(r.pool.inner.QueryRow(ctx, q, shipmentID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Shipment{}, domain.ErrNotFound
		}
		return domain.Shipment{}, fmt.Errorf("get customs shipment: %w", err)
	}
	return shipment, nil
}
