package repository

import (
    "context"
    "fmt"
    "time"

    "github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
)

type SellerRepo struct {
    pool *Pool
}

func NewSellerRepo(pool *Pool) *SellerRepo {
    return &SellerRepo{pool: pool}
}

// List pending shipments for a seller
func (r *SellerRepo) ListPendingShipments(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error) {
    if limit <= 0 || limit > 500 {
        limit = 100
    }
    const q = `
SELECT id, importer_id, seller_id, origin_port, destination_port, cargo_type, weight_kg, volume_cbm, status, anchor_status, created_at, updated_at
FROM shipments
WHERE seller_id = $1 AND status IN ('INITIATED', 'PENDING_SELLER')
ORDER BY created_at ASC
LIMIT $2
`
    rows, err := r.pool.inner.Query(ctx, q, sellerID, limit)
    if err != nil {
        return nil, fmt.Errorf("list pending shipments: %w", err)
    }
    defer rows.Close()
    out := []domain.Shipment{}
    for rows.Next() {
        var s domain.Shipment
        if err := rows.Scan(&s.ID, &s.ImporterID, &s.SellerID, &s.OriginPort, &s.DestinationPort, &s.CargoType, &s.WeightKG, &s.VolumeCBM, &s.Status, &s.AnchorStatus, &s.CreatedAt, &s.UpdatedAt); err != nil {
            return nil, fmt.Errorf("scan shipment: %w", err)
        }
        out = append(out, s)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate shipments: %w", err)
    }
    return out, nil
}

func (r *SellerRepo) GetShipmentDocuments(ctx context.Context, shipmentID string) ([]domain.ShipmentDocument, error) {
    const q = `
SELECT id, doc_type, original_file_name, content_type, size_bytes, storage_key, sha256_hash, uploaded_at
FROM shipment_documents
WHERE shipment_id = $1
ORDER BY uploaded_at ASC
`
    rows, err := r.pool.inner.Query(ctx, q, shipmentID)
    if err != nil {
        return nil, fmt.Errorf("get shipment documents: %w", err)
    }
    defer rows.Close()
    out := []domain.ShipmentDocument{}
    for rows.Next() {
        var d domain.ShipmentDocument
        if err := rows.Scan(&d.ID, &d.DocType, &d.OriginalFileName, &d.ContentType, &d.SizeBytes, &d.StorageKey, &d.SHA256Hash, &d.UploadedAt); err != nil {
            return nil, fmt.Errorf("scan doc: %w", err)
        }
        out = append(out, d)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate docs: %w", err)
    }
    return out, nil
}

func (r *SellerRepo) AddSellerDocument(ctx context.Context, shipmentID, sellerID string, doc domain.SellerDocument) (domain.SellerDocument, error) {
    const q = `
INSERT INTO seller_documents (shipment_id, seller_id, doc_type, original_file_name, content_type, size_bytes, storage_key, sha256_hash)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
RETURNING id, uploaded_at
`
    row := r.pool.inner.QueryRow(ctx, q, shipmentID, sellerID, doc.DocType, doc.OriginalFileName, doc.ContentType, doc.SizeBytes, doc.StorageKey, doc.SHA256Hash)
    var id string
    var uploaded time.Time
    if err := row.Scan(&id, &uploaded); err != nil {
        return domain.SellerDocument{}, fmt.Errorf("add seller doc: %w", err)
    }
    doc.ID = id
    doc.UploadedAt = uploaded
    return doc, nil
}

func (r *SellerRepo) CreateVerification(ctx context.Context, v domain.SellerVerification) (domain.SellerVerification, error) {
    const q = `
INSERT INTO seller_verifications (shipment_id, seller_id, action, checks, reason, tx_id)
VALUES ($1,$2,$3,$4,$5,$6)
RETURNING id, created_at
`
    row := r.pool.inner.QueryRow(ctx, q, v.ShipmentID, v.SellerID, v.Action, v.Checks, v.Reason, v.TxID)
    var id string
    var created time.Time
    if err := row.Scan(&id, &created); err != nil {
        return domain.SellerVerification{}, fmt.Errorf("create verification: %w", err)
    }
    v.ID = id
    v.CreatedAt = &created
    return v, nil
}

func (r *SellerRepo) SetShipmentStatus(ctx context.Context, shipmentID, status string) error {
    const q = `UPDATE shipments SET status = $2, updated_at = now() WHERE id = $1`
    _, err := r.pool.inner.Exec(ctx, q, shipmentID, status)
    if err != nil {
        return fmt.Errorf("set shipment status: %w", err)
    }
    return nil
}

func (r *SellerRepo) ListApprovedShipments(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error) {
    if limit <= 0 || limit > 500 {
        limit = 100
    }
    const q = `
SELECT id, importer_id, seller_id, origin_port, destination_port, cargo_type, weight_kg, volume_cbm, status, anchor_status, created_at, updated_at
FROM shipments
WHERE seller_id = $1 AND status = 'SELLER_VERIFIED'
ORDER BY updated_at DESC
LIMIT $2
`
    rows, err := r.pool.inner.Query(ctx, q, sellerID, limit)
    if err != nil {
        return nil, fmt.Errorf("list approved shipments: %w", err)
    }
    defer rows.Close()
    out := []domain.Shipment{}
    for rows.Next() {
        var s domain.Shipment
        if err := rows.Scan(&s.ID, &s.ImporterID, &s.SellerID, &s.OriginPort, &s.DestinationPort, &s.CargoType, &s.WeightKG, &s.VolumeCBM, &s.Status, &s.AnchorStatus, &s.CreatedAt, &s.UpdatedAt); err != nil {
            return nil, fmt.Errorf("scan shipment: %w", err)
        }
        out = append(out, s)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate shipments: %w", err)
    }
    return out, nil
}

func (r *SellerRepo) CreateNotification(ctx context.Context, n domain.Notification) (domain.Notification, error) {
    const q = `
INSERT INTO notifications (user_id, type, payload)
VALUES ($1,$2,$3)
RETURNING id, created_at
`
    row := r.pool.inner.QueryRow(ctx, q, n.UserID, n.Type, n.Payload)
    var id string
    var created time.Time
    if err := row.Scan(&id, &created); err != nil {
        return domain.Notification{}, fmt.Errorf("create notification: %w", err)
    }
    n.ID = id
    n.CreatedAt = &created
    return n, nil
}

func (r *SellerRepo) ListNotifications(ctx context.Context, userID string, limit int) ([]domain.Notification, error) {
    if limit <= 0 || limit > 500 {
        limit = 100
    }
    const q = `
SELECT id, type, payload, is_read, created_at
FROM notifications
WHERE user_id = $1
ORDER BY created_at DESC
LIMIT $2
`
    rows, err := r.pool.inner.Query(ctx, q, userID, limit)
    if err != nil {
        return nil, fmt.Errorf("list notifications: %w", err)
    }
    defer rows.Close()
    out := []domain.Notification{}
    for rows.Next() {
        var n domain.Notification
        if err := rows.Scan(&n.ID, &n.Type, &n.Payload, &n.IsRead, &n.CreatedAt); err != nil {
            return nil, fmt.Errorf("scan notification: %w", err)
        }
        out = append(out, n)
    }
    if err := rows.Err(); err != nil {
        return nil, fmt.Errorf("iterate notifications: %w", err)
    }
    return out, nil
}
