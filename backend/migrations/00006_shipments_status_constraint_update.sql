-- +goose Up
-- +goose StatementBegin
ALTER TABLE shipments
DROP CONSTRAINT IF EXISTS shipments_status_check;

ALTER TABLE shipments ADD CONSTRAINT shipments_status_check CHECK (
    status IN (
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
    )
);

-- +goose StatementEnd
-- +goose Down
-- +goose StatementBegin
ALTER TABLE shipments
DROP CONSTRAINT IF EXISTS shipments_status_check;

ALTER TABLE shipments ADD CONSTRAINT shipments_status_check CHECK (
    status IN (
        'INITIATED',
        'DOCS_UPLOADED',
        'PENDING_VERIFICATION',
        'VERIFIED',
        'APPROVED',
        'ALLOCATED',
        'IN_TRANSIT',
        'ARRIVED',
        'AT_CUSTOMS',
        'HELD_FOR_INSPECTION',
        'CLEARED'
    )
);

-- +goose StatementEnd