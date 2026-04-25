-- +goose Up
-- +goose StatementBegin

CREATE TABLE IF NOT EXISTS shipments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  importer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  seller_id UUID REFERENCES users(id) ON DELETE SET NULL,

  origin_port TEXT NOT NULL,
  destination_port TEXT NOT NULL,
  cargo_type TEXT NOT NULL,
  weight_kg NUMERIC(12,3) NOT NULL CHECK (weight_kg > 0),
  volume_cbm NUMERIC(12,3) CHECK (volume_cbm IS NULL OR volume_cbm > 0),

  status TEXT NOT NULL DEFAULT 'INITIATED' CHECK (status IN (
    'INITIATED',
    'DOCS_UPLOADED',
    'PENDING_VERIFICATION',
    'VERIFIED',
    'APPROVED',
    'EXPORT_DOCS_UPLOADED',
    'REJECTED',
    'ALLOCATED',
    'IN_TRANSIT',
    'ARRIVED',
    'AT_CUSTOMS',
    'HELD_FOR_INSPECTION',
    'CLEARED'
  )),

  anchor_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (anchor_status IN ('PENDING', 'ANCHORED', 'FAILED')),
  blockchain_tx_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipments_importer_id ON shipments(importer_id);
CREATE INDEX IF NOT EXISTS idx_shipments_seller_id ON shipments(seller_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_created_at ON shipments(created_at);

CREATE TABLE IF NOT EXISTS shipment_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,

  doc_type TEXT NOT NULL CHECK (doc_type IN (
    'BILL_OF_LADING',
    'COMMERCIAL_INVOICE',
    'LETTER_OF_CREDIT',
    'SUPPLEMENTAL'
  )),

  original_file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),
  storage_key TEXT NOT NULL,
  sha256_hash TEXT NOT NULL,

  verification_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (verification_status IN (
    'PENDING',
    'MATCHED',
    'MISMATCHED',
    'REJECTED'
  )),

  uploaded_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  ipfs_cid TEXT,
  anchor_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (anchor_status IN ('PENDING', 'ANCHORED', 'FAILED')),
  blockchain_tx_hash TEXT,

  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_documents_shipment_id ON shipment_documents(shipment_id);
CREATE INDEX IF NOT EXISTS idx_shipment_documents_doc_type ON shipment_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_shipment_documents_sha256_hash ON shipment_documents(sha256_hash);

CREATE TABLE IF NOT EXISTS shipment_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id UUID NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,

  actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  message TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,

  event_hash TEXT NOT NULL,
  previous_event_hash TEXT,
  anchor_status TEXT NOT NULL DEFAULT 'PENDING' CHECK (anchor_status IN ('PENDING', 'ANCHORED', 'FAILED')),
  blockchain_tx_hash TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shipment_events_shipment_id_created_at ON shipment_events(shipment_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shipment_events_actor_id ON shipment_events(actor_id);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  role_target TEXT CHECK (role_target IS NULL OR role_target IN ('IMPORTER', 'SELLER', 'TRANSPORTER', 'CUSTOMS', 'ESL_AGENT', 'ADMIN')),
  shipment_id UUID REFERENCES shipments(id) ON DELETE CASCADE,

  type TEXT NOT NULL,
  message TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CHECK (user_id IS NOT NULL OR role_target IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id_read_at ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_role_target_read_at ON notifications(role_target, read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_shipment_id ON notifications(shipment_id);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS shipment_events;
DROP TABLE IF EXISTS shipment_documents;
DROP TABLE IF EXISTS shipments;
-- +goose StatementEnd
