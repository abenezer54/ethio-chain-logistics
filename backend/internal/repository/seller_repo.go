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
SELECT
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
FROM shipments
-- Pending for seller: only shown after importer uploads documents
WHERE seller_id = $1 AND status IN ('DOCS_UPLOADED', 'PENDING_VERIFICATION')
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
		s, err := scanShipment(rows)
		if err != nil {
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
SELECT
  id, shipment_id, doc_type,
  original_file_name, content_type, size_bytes,
  storage_key, sha256_hash, verification_status,
  uploaded_by, COALESCE(ipfs_cid, ''), anchor_status,
  COALESCE(blockchain_tx_hash, ''), uploaded_at
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
		d, err := scanDocument(rows)
		if err != nil {
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
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return domain.SellerDocument{}, fmt.Errorf("begin add seller document: %w", err)
	}
	defer tx.Rollback(ctx)

	const q = `
INSERT INTO seller_documents (
  shipment_id, seller_id, doc_type,
  original_file_name, content_type, size_bytes,
  storage_key, sha256_hash, anchor_status
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
RETURNING id, anchor_status, COALESCE(blockchain_tx_hash, ''), uploaded_at
`
	var anchorStatus string
	if err := tx.QueryRow(ctx, q,
		shipmentID, sellerID, doc.DocType,
		doc.OriginalFileName, doc.ContentType, doc.SizeBytes,
		doc.StorageKey, doc.SHA256Hash, domain.AnchorStatusPending,
	).Scan(&doc.ID, &anchorStatus, &doc.BlockchainTxHash, &doc.UploadedAt); err != nil {
		return domain.SellerDocument{}, fmt.Errorf("add seller doc: %w", err)
	}
	doc.ShipmentID = shipmentID
	doc.SellerID = sellerID
	doc.AnchorStatus = domain.AnchorStatus(anchorStatus)
	if err := enqueueAnchorJobTx(ctx, tx,
		"seller_documents",
		doc.ID,
		shipmentID,
		domain.AnchorRecordTypeSellerDocument,
		doc.SHA256Hash,
		"",
	); err != nil {
		return domain.SellerDocument{}, err
	}
	if err := tx.Commit(ctx); err != nil {
		return domain.SellerDocument{}, fmt.Errorf("commit add seller document: %w", err)
	}
	return doc, nil
}

func (r *SellerRepo) GetSellerDocument(ctx context.Context, docID string) (domain.SellerDocument, error) {
	const q = `
SELECT
  id, shipment_id, seller_id, doc_type,
  original_file_name, content_type, size_bytes,
  storage_key, sha256_hash, anchor_status,
  COALESCE(blockchain_tx_hash, ''), uploaded_at
FROM seller_documents
WHERE id = $1
`
	row := r.pool.inner.QueryRow(ctx, q, docID)
	var d domain.SellerDocument
	var anchorStatus string
	if err := row.Scan(
		&d.ID, &d.ShipmentID, &d.SellerID, &d.DocType,
		&d.OriginalFileName, &d.ContentType, &d.SizeBytes,
		&d.StorageKey, &d.SHA256Hash, &anchorStatus,
		&d.BlockchainTxHash, &d.UploadedAt,
	); err != nil {
		return domain.SellerDocument{}, fmt.Errorf("get seller doc: %w", err)
	}
	d.AnchorStatus = domain.AnchorStatus(anchorStatus)
	return d, nil
}

func (r *SellerRepo) GetShipmentDocument(ctx context.Context, docID string) (domain.ShipmentDocument, error) {
	const q = `
SELECT
  id, shipment_id, doc_type,
  original_file_name, content_type, size_bytes,
  storage_key, sha256_hash, verification_status,
  uploaded_by, COALESCE(ipfs_cid, ''), anchor_status,
  COALESCE(blockchain_tx_hash, ''), uploaded_at
FROM shipment_documents
WHERE id = $1
`
	row := r.pool.inner.QueryRow(ctx, q, docID)
	var d domain.ShipmentDocument
	var docType string
	var ipfs string
	var blockchain string
	var verification string
	if err := row.Scan(&d.ID, &d.ShipmentID, &docType, &d.OriginalFileName, &d.ContentType, &d.SizeBytes, &d.StorageKey, &d.SHA256Hash, &verification, &d.UploadedBy, &ipfs, &d.AnchorStatus, &blockchain, &d.UploadedAt); err != nil {
		return domain.ShipmentDocument{}, fmt.Errorf("get shipment doc: %w", err)
	}
	d.DocType = domain.ShipmentDocumentType(docType)
	d.VerificationStatus = domain.DocumentVerificationStatus(verification)
	d.IPFSCID = ipfs
	d.BlockchainTxHash = blockchain
	return d, nil
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
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin set shipment status: %w", err)
	}
	defer tx.Rollback(ctx)

	// When rejecting a shipment, mark all existing documents as rejected
	if status == string(domain.ShipmentStatusRejected) {
		const markDocsRejectedQ = `
UPDATE shipment_documents
SET verification_status = $2
WHERE shipment_id = $1 AND verification_status != $2
`
		_, err := tx.Exec(ctx, markDocsRejectedQ, shipmentID, domain.DocumentVerificationRejected)
		if err != nil {
			return fmt.Errorf("mark documents as rejected: %w", err)
		}
	}

	const q = `UPDATE shipments SET status = $2, updated_at = now() WHERE id = $1`
	_, err = tx.Exec(ctx, q, shipmentID, status)
	if err != nil {
		return fmt.Errorf("set shipment status: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit set shipment status: %w", err)
	}
	return nil
}

func (r *SellerRepo) CreateShipmentEvent(ctx context.Context, shipmentID, actorID, action, message string, fromStatus, toStatus domain.ShipmentStatus, metadata map[string]any) error {
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin create shipment event: %w", err)
	}
	defer tx.Rollback(ctx)

	if _, err := (&ShipmentRepo{pool: r.pool}).appendEvent(ctx, tx, shipmentEventInput{
		ShipmentID: shipmentID,
		ActorID:    actorID,
		ActorRole:  domain.RoleSeller,
		Action:     action,
		FromStatus: fromStatus,
		ToStatus:   toStatus,
		Message:    message,
		Metadata:   metadata,
	}); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit create shipment event: %w", err)
	}
	return nil
}

func (r *SellerRepo) ListApprovedShipments(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error) {
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
	WHERE seller_id = $1 AND status IN ('VERIFIED', 'EXPORT_DOCS_UPLOADED')
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
		s, err := scanShipment(rows)
		if err != nil {
			return nil, fmt.Errorf("scan shipment: %w", err)
		}
		out = append(out, s)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate shipments: %w", err)
	}
	return out, nil
}

// List all shipments for a seller (for "All Shipments" view)
func (r *SellerRepo) ListAllShipments(ctx context.Context, sellerID string, limit int) ([]domain.Shipment, error) {
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
	WHERE seller_id = $1
	ORDER BY updated_at DESC
	LIMIT $2
	`
	rows, err := r.pool.inner.Query(ctx, q, sellerID, limit)
	if err != nil {
		return nil, fmt.Errorf("list all shipments: %w", err)
	}
	defer rows.Close()
	out := []domain.Shipment{}
	for rows.Next() {
		s, err := scanShipment(rows)
		if err != nil {
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
