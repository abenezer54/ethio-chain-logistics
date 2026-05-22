package repository

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/abenezer54/ethio-chain-logistics/backend/internal/domain"
	"github.com/jackc/pgx/v5"
)

var ErrNoAnchorJobs = errors.New("no anchor jobs")

type AnchorJobRepo struct {
	pool *Pool
}

func NewAnchorJobRepo(pool *Pool) *AnchorJobRepo {
	return &AnchorJobRepo{pool: pool}
}

func (r *AnchorJobRepo) ClaimNext(ctx context.Context) (domain.AnchorJob, error) {
	const q = `
WITH next_job AS (
  SELECT id
  FROM blockchain_anchor_jobs
  WHERE status IN ('PENDING', 'FAILED')
    AND attempt_count < 10
  ORDER BY created_at ASC
  FOR UPDATE SKIP LOCKED
  LIMIT 1
)
UPDATE blockchain_anchor_jobs j
SET status = 'PROCESSING',
    attempt_count = j.attempt_count + 1,
    updated_at = now()
FROM next_job
WHERE j.id = next_job.id
RETURNING
  j.id, j.target_table, j.target_id::text, j.shipment_id::text,
  j.record_type, j.record_hash, COALESCE(j.previous_hash, ''),
  j.status, j.attempt_count, COALESCE(j.last_error, ''),
  COALESCE(j.blockchain_tx_hash, ''), j.created_at, j.updated_at, j.processed_at
`
	job, err := scanAnchorJob(r.pool.inner.QueryRow(ctx, q))
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return domain.AnchorJob{}, ErrNoAnchorJobs
		}
		return domain.AnchorJob{}, fmt.Errorf("claim anchor job: %w", err)
	}
	return job, nil
}

func (r *AnchorJobRepo) MarkAnchored(ctx context.Context, job domain.AnchorJob, txHash string) error {
	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin mark anchor job anchored: %w", err)
	}
	defer tx.Rollback(ctx)

	const jobQ = `
UPDATE blockchain_anchor_jobs
SET status = 'ANCHORED',
    blockchain_tx_hash = $2,
    last_error = NULL,
    processed_at = now(),
    updated_at = now()
WHERE id = $1
`
	if _, err := tx.Exec(ctx, jobQ, job.ID, txHash); err != nil {
		return fmt.Errorf("mark anchor job anchored: %w", err)
	}
	if err := updateAnchorTarget(ctx, tx, job.TargetTable, job.TargetID, domain.AnchorStatusAnchored, txHash); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit mark anchor job anchored: %w", err)
	}
	return nil
}

func (r *AnchorJobRepo) MarkAlreadyAnchored(ctx context.Context, job domain.AnchorJob) error {
	const q = `
SELECT blockchain_tx_hash
FROM blockchain_anchor_jobs
WHERE record_hash = $1
  AND status = 'ANCHORED'
  AND COALESCE(blockchain_tx_hash, '') <> ''
ORDER BY processed_at DESC NULLS LAST, updated_at DESC
LIMIT 1
`
	var txHash string
	if err := r.pool.inner.QueryRow(ctx, q, job.RecordHash).Scan(&txHash); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return fmt.Errorf("record is already anchored on-chain but no local anchored transaction was found")
		}
		return fmt.Errorf("lookup already anchored transaction: %w", err)
	}
	return r.MarkAnchored(ctx, job, txHash)
}

func (r *AnchorJobRepo) MarkFailed(ctx context.Context, job domain.AnchorJob, cause error) error {
	message := "unknown blockchain anchor error"
	if cause != nil {
		message = strings.TrimSpace(cause.Error())
	}
	if len(message) > 1000 {
		message = message[:1000]
	}

	tx, err := r.pool.inner.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin mark anchor job failed: %w", err)
	}
	defer tx.Rollback(ctx)

	const jobQ = `
UPDATE blockchain_anchor_jobs
SET status = 'FAILED',
    last_error = $2,
    updated_at = now()
WHERE id = $1
`
	if _, err := tx.Exec(ctx, jobQ, job.ID, message); err != nil {
		return fmt.Errorf("mark anchor job failed: %w", err)
	}
	if err := updateAnchorTarget(ctx, tx, job.TargetTable, job.TargetID, domain.AnchorStatusFailed, ""); err != nil {
		return err
	}
	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit mark anchor job failed: %w", err)
	}
	return nil
}

func enqueueAnchorJobTx(ctx context.Context, tx pgx.Tx, targetTable, targetID, shipmentID string, recordType domain.AnchorRecordType, recordHash, previousHash string) error {
	recordHash = strings.TrimSpace(strings.ToLower(recordHash))
	previousHash = strings.TrimSpace(strings.ToLower(previousHash))
	if recordHash == "" {
		return nil
	}
	const q = `
INSERT INTO blockchain_anchor_jobs (
  target_table, target_id, shipment_id,
  record_type, record_hash, previous_hash
)
VALUES ($1,$2::uuid,$3::uuid,$4,$5,NULLIF($6, ''))
ON CONFLICT (target_table, target_id, record_hash) DO NOTHING
`
	if _, err := tx.Exec(ctx, q, targetTable, targetID, shipmentID, int(recordType), recordHash, previousHash); err != nil {
		return fmt.Errorf("enqueue anchor job: %w", err)
	}
	return nil
}

func updateAnchorTarget(ctx context.Context, tx pgx.Tx, targetTable, targetID string, status domain.AnchorStatus, txHash string) error {
	switch targetTable {
	case "shipment_events":
		const q = `
UPDATE shipment_events
SET anchor_status = $2, blockchain_tx_hash = NULLIF($3, '')
WHERE id = $1::uuid
`
		if _, err := tx.Exec(ctx, q, targetID, status, txHash); err != nil {
			return fmt.Errorf("update shipment event anchor status: %w", err)
		}
	case "shipment_documents":
		const q = `
UPDATE shipment_documents
SET anchor_status = $2, blockchain_tx_hash = NULLIF($3, '')
WHERE id = $1::uuid
`
		if _, err := tx.Exec(ctx, q, targetID, status, txHash); err != nil {
			return fmt.Errorf("update shipment document anchor status: %w", err)
		}
	case "seller_documents":
		const q = `
UPDATE seller_documents
SET anchor_status = $2, blockchain_tx_hash = NULLIF($3, '')
WHERE id = $1::uuid
`
		if _, err := tx.Exec(ctx, q, targetID, status, txHash); err != nil {
			return fmt.Errorf("update seller document anchor status: %w", err)
		}
	default:
		return fmt.Errorf("unsupported anchor target table %q", targetTable)
	}
	return nil
}

func scanAnchorJob(row rowScanner) (domain.AnchorJob, error) {
	var job domain.AnchorJob
	var status string
	var recordType int
	if err := row.Scan(
		&job.ID, &job.TargetTable, &job.TargetID, &job.ShipmentID,
		&recordType, &job.RecordHash, &job.PreviousHash,
		&status, &job.AttemptCount, &job.LastError,
		&job.BlockchainTxHash, &job.CreatedAt, &job.UpdatedAt, &job.ProcessedAt,
	); err != nil {
		return domain.AnchorJob{}, err
	}
	job.RecordType = domain.AnchorRecordType(recordType)
	job.Status = domain.AnchorJobStatus(status)
	return job, nil
}
