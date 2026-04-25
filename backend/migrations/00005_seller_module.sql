-- +goose Up
-- Add tables for seller documents, verifications, and notifications
CREATE TABLE IF NOT EXISTS seller_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    shipment_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    doc_type TEXT NOT NULL,
    original_file_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key TEXT NOT NULL,
    sha256_hash TEXT NOT NULL,
    uploaded_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS idx_seller_documents_shipment ON seller_documents (shipment_id);

CREATE TABLE IF NOT EXISTS seller_verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    shipment_id UUID NOT NULL,
    seller_id UUID NOT NULL,
    action TEXT NOT NULL, -- APPROVED, REJECTED, REQUEST_CHANGES
    checks JSONB,
    reason TEXT,
    tx_id TEXT, -- simulated blockchain tx id
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS idx_seller_verifications_shipment ON seller_verifications (shipment_id);

CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid (),
    user_id UUID NOT NULL,
    type TEXT NOT NULL,
    payload JSONB NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP
    WITH
        TIME ZONE DEFAULT now ()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id);

-- +goose Down
DROP INDEX IF EXISTS idx_notifications_user;

DROP TABLE IF EXISTS notifications;

DROP INDEX IF EXISTS idx_seller_verifications_shipment;

DROP TABLE IF EXISTS seller_verifications;

DROP INDEX IF EXISTS idx_seller_documents_shipment;

DROP TABLE IF EXISTS seller_documents;