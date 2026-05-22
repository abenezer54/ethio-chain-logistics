-- +goose Up
-- +goose StatementBegin

ALTER TABLE seller_documents
  ADD COLUMN IF NOT EXISTS anchor_status TEXT NOT NULL DEFAULT 'PENDING',
  ADD COLUMN IF NOT EXISTS blockchain_tx_hash TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'seller_documents_anchor_status_check'
  ) THEN
    ALTER TABLE seller_documents
      ADD CONSTRAINT seller_documents_anchor_status_check
      CHECK (anchor_status IN ('PENDING', 'ANCHORED', 'FAILED'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS blockchain_anchor_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_table TEXT NOT NULL CHECK (target_table IN ('shipment_events', 'shipment_documents', 'seller_documents')),
  target_id UUID NOT NULL,
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  record_type SMALLINT NOT NULL CHECK (record_type IN (1, 2, 3)),
  record_hash TEXT NOT NULL,
  previous_hash TEXT,
  status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'ANCHORED', 'FAILED')),
  attempt_count INTEGER NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  last_error TEXT,
  blockchain_tx_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_blockchain_anchor_jobs_target_hash
  ON blockchain_anchor_jobs(target_table, target_id, record_hash);

CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_jobs_status_created_at
  ON blockchain_anchor_jobs(status, created_at);

CREATE INDEX IF NOT EXISTS idx_blockchain_anchor_jobs_shipment_id
  ON blockchain_anchor_jobs(shipment_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_blockchain_anchor_jobs_shipment_id;
DROP INDEX IF EXISTS idx_blockchain_anchor_jobs_status_created_at;
DROP INDEX IF EXISTS idx_blockchain_anchor_jobs_target_hash;
DROP TABLE IF EXISTS blockchain_anchor_jobs;

ALTER TABLE seller_documents
  DROP CONSTRAINT IF EXISTS seller_documents_anchor_status_check,
  DROP COLUMN IF EXISTS blockchain_tx_hash,
  DROP COLUMN IF EXISTS anchor_status;
-- +goose StatementEnd

