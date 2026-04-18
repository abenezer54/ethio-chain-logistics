package repository

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/jackc/pgx/v5"
)

type ShipmentRepo struct {
	pool *Pool
}

func NewShipmentRepo(pool *Pool) *ShipmentRepo {
	return &ShipmentRepo{pool: pool}
}

func (r *ShipmentRepo) CreateShipment(ctx context.Context, s domain.Shipment) (domain.Shipment, error) {
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return domain.Shipment{}, fmt.Errorf("begin create shipment: %w", err)
	}
	defer tx.Rollback(ctx)

	const q = `
INSERT INTO shipments (
  importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg, volume_cbm,
  status, anchor_status
)
VALUES ($1,$2,$3,$4,$5,$6::numeric,NULLIF($7, '')::numeric,$8,$9)
RETURNING
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
`
	var sellerID *string
	if s.SellerID != "" {
		sellerID = &s.SellerID
	}
	created, err := scanShipment(tx.QueryRow(ctx, q,
		s.ImporterID, sellerID,
		s.OriginPort, s.DestinationPort, s.CargoType,
		s.WeightKG, s.VolumeCBM,
		domain.ShipmentStatusInitiated, domain.AnchorStatusPending,
	))
	if err != nil {
		return domain.Shipment{}, fmt.Errorf("create shipment: %w", err)
	}

	if _, err := r.appendEvent(ctx, tx, shipmentEventInput{
		ShipmentID: created.ID,
		ActorID:    created.ImporterID,
		ActorRole:  domain.RoleImporter,
		Action:     "SHIPMENT_INITIATED",
		ToStatus:   domain.ShipmentStatusInitiated,
		Message:    "Importer created shipment request.",
		Metadata: map[string]any{
			"origin_port":      created.OriginPort,
			"destination_port": created.DestinationPort,
			"cargo_type":       created.CargoType,
		},
	}); err != nil {
		return domain.Shipment{}, err
	}

	if err := r.addRoleNotification(ctx, tx, "SELLER", created.ID, "SHIPMENT_INITIATED", "A shipment request is ready for document review."); err != nil {
		return domain.Shipment{}, err
	}
	if err := r.addRoleNotification(ctx, tx, "ESL_AGENT", created.ID, "SHIPMENT_INITIATED", "A shipment request has been initiated."); err != nil {
		return domain.Shipment{}, err
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.Shipment{}, fmt.Errorf("commit create shipment: %w", err)
	}
	return created, nil
}

func (r *ShipmentRepo) ListImporterShipments(ctx context.Context, importerID string, limit int) ([]domain.Shipment, error) {
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
WHERE importer_id = $1
ORDER BY created_at DESC
LIMIT $2
`
	rows, err := r.pool.inner.Query(ctx, q, importerID, limit)
	if err != nil {
		return nil, fmt.Errorf("list importer shipments: %w", err)
	}
	defer rows.Close()

	out := make([]domain.Shipment, 0, limit)
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

func (r *ShipmentRepo) GetImporterShipmentDetail(ctx context.Context, importerID, shipmentID string) (domain.ShipmentDetail, error) {
	s, err := r.getImporterShipment(ctx, importerID, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}

	docs, err := r.listDocuments(ctx, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}
	events, err := r.listEvents(ctx, shipmentID)
	if err != nil {
		return domain.ShipmentDetail{}, err
	}
	return domain.ShipmentDetail{Shipment: s, Documents: docs, Events: events}, nil
}

func (r *ShipmentRepo) AddShipmentDocuments(ctx context.Context, importerID, shipmentID string, docs []domain.ShipmentDocument) (domain.ShipmentDetail, error) {
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("begin add shipment documents: %w", err)
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
WHERE id = $1 AND importer_id = $2
FOR UPDATE
`
	current, err := scanShipment(tx.QueryRow(ctx, lockQ, shipmentID, importerID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ShipmentDetail{}, domain.ErrNotFound
		}
		return domain.ShipmentDetail{}, fmt.Errorf("lock shipment: %w", err)
	}

	switch current.Status {
	case domain.ShipmentStatusInitiated, domain.ShipmentStatusDocsUploaded, domain.ShipmentStatusPendingVerification:
	default:
		return domain.ShipmentDetail{}, fmt.Errorf("%w: shipment is no longer editable", domain.ErrValidation)
	}

	const insertDocQ = `
INSERT INTO shipment_documents (
  shipment_id, doc_type,
  original_file_name, content_type, size_bytes,
  storage_key, sha256_hash,
  verification_status, uploaded_by,
  anchor_status
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
RETURNING id, uploaded_at
`
	insertedTypes := make([]string, 0, len(docs))
	for i := range docs {
		docs[i].ShipmentID = shipmentID
		docs[i].UploadedBy = importerID
		docs[i].VerificationStatus = domain.DocumentVerificationPending
		docs[i].AnchorStatus = domain.AnchorStatusPending

		if err := tx.QueryRow(ctx, insertDocQ,
			docs[i].ShipmentID, docs[i].DocType,
			docs[i].OriginalFileName, docs[i].ContentType, docs[i].SizeBytes,
			docs[i].StorageKey, docs[i].SHA256Hash,
			docs[i].VerificationStatus, docs[i].UploadedBy,
			docs[i].AnchorStatus,
		).Scan(&docs[i].ID, &docs[i].UploadedAt); err != nil {
			return domain.ShipmentDetail{}, fmt.Errorf("insert shipment document: %w", err)
		}
		insertedTypes = append(insertedTypes, string(docs[i].DocType))
	}

	originalStatus := current.Status
	nextStatus := current.Status
	if current.Status == domain.ShipmentStatusInitiated {
		hasRequired, err := r.hasRequiredImporterDocs(ctx, tx, shipmentID)
		if err != nil {
			return domain.ShipmentDetail{}, err
		}
		if hasRequired {
			nextStatus = domain.ShipmentStatusDocsUploaded
			const updateQ = `
UPDATE shipments
SET status = $3, updated_at = now()
WHERE id = $1 AND importer_id = $2
RETURNING
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
`
			current, err = scanShipment(tx.QueryRow(ctx, updateQ, shipmentID, importerID, nextStatus))
			if err != nil {
				return domain.ShipmentDetail{}, fmt.Errorf("update shipment document status: %w", err)
			}
		}
	}

	transitioned := nextStatus != originalStatus
	eventAction := "DOCUMENT_UPLOADED"
	message := "Importer uploaded shipment document."
	var fromStatus domain.ShipmentStatus
	var toStatus domain.ShipmentStatus
	if transitioned {
		eventAction = "DOCUMENTS_UPLOADED"
		message = "Importer uploaded required shipment documents."
		fromStatus = originalStatus
		toStatus = nextStatus
	}

	if _, err := r.appendEvent(ctx, tx, shipmentEventInput{
		ShipmentID: shipmentID,
		ActorID:    importerID,
		ActorRole:  domain.RoleImporter,
		Action:     eventAction,
		FromStatus: fromStatus,
		ToStatus:   toStatus,
		Message:    message,
		Metadata:   map[string]any{"document_types": insertedTypes},
	}); err != nil {
		return domain.ShipmentDetail{}, err
	}

	if transitioned {
		if err := r.addRoleNotification(ctx, tx, "SELLER", shipmentID, "DOCUMENTS_UPLOADED", "Shipment documents are ready for verification."); err != nil {
			return domain.ShipmentDetail{}, err
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return domain.ShipmentDetail{}, fmt.Errorf("commit add shipment documents: %w", err)
	}
	return r.GetImporterShipmentDetail(ctx, importerID, current.ID)
}

func (r *ShipmentRepo) GetImporterShipmentDocument(ctx context.Context, importerID, shipmentID, docID string) (domain.ShipmentDocument, error) {
	const q = `
SELECT
  d.id, d.shipment_id, d.doc_type,
  d.original_file_name, d.content_type, d.size_bytes,
  d.storage_key, d.sha256_hash, d.verification_status,
  d.uploaded_by, COALESCE(d.ipfs_cid, ''), d.anchor_status,
  COALESCE(d.blockchain_tx_hash, ''), d.uploaded_at
FROM shipment_documents d
JOIN shipments s ON s.id = d.shipment_id
WHERE d.id = $1 AND d.shipment_id = $2 AND s.importer_id = $3
`
	d, err := scanDocument(r.pool.inner.QueryRow(ctx, q, docID, shipmentID, importerID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.ShipmentDocument{}, domain.ErrNotFound
		}
		return domain.ShipmentDocument{}, fmt.Errorf("get importer shipment document: %w", err)
	}
	return d, nil
}

func (r *ShipmentRepo) getImporterShipment(ctx context.Context, importerID, shipmentID string) (domain.Shipment, error) {
	const q = `
SELECT
  id, importer_id, seller_id,
  origin_port, destination_port, cargo_type,
  weight_kg::text, COALESCE(volume_cbm::text, ''),
  status, anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at, updated_at
FROM shipments
WHERE id = $1 AND importer_id = $2
`
	s, err := scanShipment(r.pool.inner.QueryRow(ctx, q, shipmentID, importerID))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.Shipment{}, domain.ErrNotFound
		}
		return domain.Shipment{}, fmt.Errorf("get importer shipment: %w", err)
	}
	return s, nil
}

func (r *ShipmentRepo) listDocuments(ctx context.Context, shipmentID string) ([]domain.ShipmentDocument, error) {
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
		return nil, fmt.Errorf("list shipment documents: %w", err)
	}
	defer rows.Close()

	out := make([]domain.ShipmentDocument, 0)
	for rows.Next() {
		d, err := scanDocument(rows)
		if err != nil {
			return nil, fmt.Errorf("scan shipment document: %w", err)
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate shipment documents: %w", err)
	}
	return out, nil
}

func (r *ShipmentRepo) listEvents(ctx context.Context, shipmentID string) ([]domain.ShipmentEvent, error) {
	const q = `
SELECT
  id, shipment_id, COALESCE(actor_id::text, ''), actor_role,
  action, COALESCE(from_status, ''), COALESCE(to_status, ''),
  COALESCE(message, ''), metadata,
  event_hash, COALESCE(previous_event_hash, ''),
  anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at
FROM shipment_events
WHERE shipment_id = $1
ORDER BY created_at ASC
`
	rows, err := r.pool.inner.Query(ctx, q, shipmentID)
	if err != nil {
		return nil, fmt.Errorf("list shipment events: %w", err)
	}
	defer rows.Close()

	out := make([]domain.ShipmentEvent, 0)
	for rows.Next() {
		e, err := scanEvent(rows)
		if err != nil {
			return nil, fmt.Errorf("scan shipment event: %w", err)
		}
		out = append(out, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate shipment events: %w", err)
	}
	return out, nil
}

func (r *ShipmentRepo) hasRequiredImporterDocs(ctx context.Context, tx pgx.Tx, shipmentID string) (bool, error) {
	const q = `
SELECT COUNT(DISTINCT doc_type)
FROM shipment_documents
WHERE shipment_id = $1
  AND doc_type IN ('BILL_OF_LADING', 'COMMERCIAL_INVOICE')
`
	var count int
	if err := tx.QueryRow(ctx, q, shipmentID).Scan(&count); err != nil {
		return false, fmt.Errorf("check required shipment documents: %w", err)
	}
	return count == 2, nil
}

type shipmentEventInput struct {
	ShipmentID string
	ActorID    string
	ActorRole  domain.UserRole
	Action     string
	FromStatus domain.ShipmentStatus
	ToStatus   domain.ShipmentStatus
	Message    string
	Metadata   map[string]any
}

func (r *ShipmentRepo) appendEvent(ctx context.Context, tx pgx.Tx, input shipmentEventInput) (domain.ShipmentEvent, error) {
	const latestQ = `
SELECT event_hash
FROM shipment_events
WHERE shipment_id = $1
ORDER BY created_at DESC
LIMIT 1
`
	var previous string
	err := tx.QueryRow(ctx, latestQ, input.ShipmentID).Scan(&previous)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return domain.ShipmentEvent{}, fmt.Errorf("read previous event hash: %w", err)
	}

	metadata := input.Metadata
	if metadata == nil {
		metadata = map[string]any{}
	}
	metadataJSON, err := json.Marshal(metadata)
	if err != nil {
		return domain.ShipmentEvent{}, fmt.Errorf("marshal event metadata: %w", err)
	}
	now := time.Now().UTC()
	eventHash, err := hashShipmentEvent(input, previous, metadataJSON, now)
	if err != nil {
		return domain.ShipmentEvent{}, err
	}

	const insertQ = `
INSERT INTO shipment_events (
  shipment_id, actor_id, actor_role, action,
  from_status, to_status, message, metadata,
  event_hash, previous_event_hash, anchor_status, created_at
)
VALUES ($1,NULLIF($2, '')::uuid,$3,$4,NULLIF($5, ''),NULLIF($6, ''),NULLIF($7, ''),$8::jsonb,$9,NULLIF($10, ''),$11,$12)
RETURNING
  id, shipment_id, COALESCE(actor_id::text, ''), actor_role,
  action, COALESCE(from_status, ''), COALESCE(to_status, ''),
  COALESCE(message, ''), metadata,
  event_hash, COALESCE(previous_event_hash, ''),
  anchor_status, COALESCE(blockchain_tx_hash, ''),
  created_at
`
	event, err := scanEvent(tx.QueryRow(ctx, insertQ,
		input.ShipmentID, input.ActorID, input.ActorRole, input.Action,
		string(input.FromStatus), string(input.ToStatus), input.Message, string(metadataJSON),
		eventHash, previous, domain.AnchorStatusPending, now,
	))
	if err != nil {
		return domain.ShipmentEvent{}, fmt.Errorf("append shipment event: %w", err)
	}
	return event, nil
}

func hashShipmentEvent(input shipmentEventInput, previous string, metadataJSON []byte, createdAt time.Time) (string, error) {
	payload := struct {
		ShipmentID        string `json:"shipment_id"`
		ActorID           string `json:"actor_id"`
		ActorRole         string `json:"actor_role"`
		Action            string `json:"action"`
		FromStatus        string `json:"from_status,omitempty"`
		ToStatus          string `json:"to_status,omitempty"`
		Message           string `json:"message,omitempty"`
		Metadata          string `json:"metadata"`
		PreviousEventHash string `json:"previous_event_hash,omitempty"`
		CreatedAt         string `json:"created_at"`
	}{
		ShipmentID:        input.ShipmentID,
		ActorID:           input.ActorID,
		ActorRole:         string(input.ActorRole),
		Action:            input.Action,
		FromStatus:        string(input.FromStatus),
		ToStatus:          string(input.ToStatus),
		Message:           input.Message,
		Metadata:          string(metadataJSON),
		PreviousEventHash: previous,
		CreatedAt:         createdAt.Format(time.RFC3339Nano),
	}
	b, err := json.Marshal(payload)
	if err != nil {
		return "", fmt.Errorf("marshal event hash payload: %w", err)
	}
	sum := sha256.Sum256(b)
	return hex.EncodeToString(sum[:]), nil
}

func (r *ShipmentRepo) addRoleNotification(ctx context.Context, tx pgx.Tx, roleTarget, shipmentID, typ, message string) error {
	const q = `
INSERT INTO notifications (role_target, shipment_id, type, message)
VALUES ($1,$2,$3,$4)
`
	if _, err := tx.Exec(ctx, q, roleTarget, shipmentID, typ, message); err != nil {
		return fmt.Errorf("add notification: %w", err)
	}
	return nil
}

type rowScanner interface {
	Scan(dest ...any) error
}

func scanShipment(row rowScanner) (domain.Shipment, error) {
	var s domain.Shipment
	var sellerID *string
	var status, anchorStatus string
	if err := row.Scan(
		&s.ID, &s.ImporterID, &sellerID,
		&s.OriginPort, &s.DestinationPort, &s.CargoType,
		&s.WeightKG, &s.VolumeCBM,
		&status, &anchorStatus, &s.BlockchainTxHash,
		&s.CreatedAt, &s.UpdatedAt,
	); err != nil {
		return domain.Shipment{}, err
	}
	s.SellerID = deref(sellerID)
	s.Status = domain.ShipmentStatus(status)
	s.AnchorStatus = domain.AnchorStatus(anchorStatus)
	return s, nil
}

func scanDocument(row rowScanner) (domain.ShipmentDocument, error) {
	var d domain.ShipmentDocument
	var docType, verificationStatus, anchorStatus string
	if err := row.Scan(
		&d.ID, &d.ShipmentID, &docType,
		&d.OriginalFileName, &d.ContentType, &d.SizeBytes,
		&d.StorageKey, &d.SHA256Hash, &verificationStatus,
		&d.UploadedBy, &d.IPFSCID, &anchorStatus,
		&d.BlockchainTxHash, &d.UploadedAt,
	); err != nil {
		return domain.ShipmentDocument{}, err
	}
	d.DocType = domain.ShipmentDocumentType(docType)
	d.VerificationStatus = domain.DocumentVerificationStatus(verificationStatus)
	d.AnchorStatus = domain.AnchorStatus(anchorStatus)
	return d, nil
}

func scanEvent(row rowScanner) (domain.ShipmentEvent, error) {
	var e domain.ShipmentEvent
	var actorRole, fromStatus, toStatus, anchorStatus string
	var metadataBytes []byte
	if err := row.Scan(
		&e.ID, &e.ShipmentID, &e.ActorID, &actorRole,
		&e.Action, &fromStatus, &toStatus,
		&e.Message, &metadataBytes,
		&e.EventHash, &e.PreviousEventHash,
		&anchorStatus, &e.BlockchainTxHash,
		&e.CreatedAt,
	); err != nil {
		return domain.ShipmentEvent{}, err
	}
	e.ActorRole = domain.UserRole(actorRole)
	e.FromStatus = domain.ShipmentStatus(fromStatus)
	e.ToStatus = domain.ShipmentStatus(toStatus)
	e.AnchorStatus = domain.AnchorStatus(anchorStatus)
	if len(metadataBytes) > 0 {
		if err := json.Unmarshal(metadataBytes, &e.Metadata); err != nil {
			return domain.ShipmentEvent{}, fmt.Errorf("unmarshal event metadata: %w", err)
		}
	}
	return e, nil
}
