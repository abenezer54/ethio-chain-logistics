package repository

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/jackc/pgx/v5"
)

type KYCDocRepo struct {
	pool *Pool
}

func NewKYCDocRepo(pool *Pool) *KYCDocRepo {
	return &KYCDocRepo{pool: pool}
}

func (r *KYCDocRepo) AddDocument(ctx context.Context, doc domain.KYCDocument) (domain.KYCDocument, error) {
	const q = `
INSERT INTO kyc_documents (
  user_id, doc_type,
  original_file_name, content_type, size_bytes,
  storage_key
)
VALUES ($1,$2,$3,$4,$5,$6)
RETURNING id, uploaded_at
`
	row := r.pool.inner.QueryRow(ctx, q,
		doc.UserID, doc.DocType,
		doc.OriginalFileName, doc.ContentType, doc.SizeBytes,
		doc.StorageKey,
	)
	var id string
	var uploadedAt time.Time
	if err := row.Scan(&id, &uploadedAt); err != nil {
		return domain.KYCDocument{}, fmt.Errorf("add document: %w", err)
	}
	doc.ID = id
	doc.UploadedAt = uploadedAt
	return doc, nil
}

func (r *KYCDocRepo) ListDocumentsByUserID(ctx context.Context, userID string) ([]domain.KYCDocument, error) {
	const q = `
SELECT id, user_id, doc_type, original_file_name, content_type, size_bytes, storage_key, uploaded_at
FROM kyc_documents
WHERE user_id = $1
ORDER BY uploaded_at ASC
`
	rows, err := r.pool.inner.Query(ctx, q, userID)
	if err != nil {
		return nil, fmt.Errorf("list documents: %w", err)
	}
	defer rows.Close()

	var out []domain.KYCDocument
	for rows.Next() {
		var d domain.KYCDocument
		if err := rows.Scan(&d.ID, &d.UserID, &d.DocType, &d.OriginalFileName, &d.ContentType, &d.SizeBytes, &d.StorageKey, &d.UploadedAt); err != nil {
			return nil, fmt.Errorf("scan document: %w", err)
		}
		out = append(out, d)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate documents: %w", err)
	}
	return out, nil
}

func (r *KYCDocRepo) GetDocumentByID(ctx context.Context, docID string) (domain.KYCDocument, error) {
	const q = `
SELECT id, user_id, doc_type, original_file_name, content_type, size_bytes, storage_key, uploaded_at
FROM kyc_documents
WHERE id = $1
`
	var d domain.KYCDocument
	err := r.pool.inner.QueryRow(ctx, q, docID).Scan(
		&d.ID, &d.UserID, &d.DocType, &d.OriginalFileName, &d.ContentType, &d.SizeBytes, &d.StorageKey, &d.UploadedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.KYCDocument{}, domain.ErrNotFound
		}
		return domain.KYCDocument{}, fmt.Errorf("get document: %w", err)
	}
	return d, nil
}

