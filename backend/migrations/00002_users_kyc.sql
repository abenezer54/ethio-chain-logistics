-- +goose Up
-- +goose StatementBegin

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,

  role TEXT NOT NULL CHECK (role IN ('IMPORTER', 'SELLER', 'TRANSPORTER', 'CUSTOMS', 'ESL_AGENT', 'ADMIN')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'ACTIVE', 'DENIED', 'INFO_REQUIRED')) DEFAULT 'PENDING',

  -- Common profile fields
  full_name TEXT,
  phone TEXT,

  -- Role-specific required fields (nullable overall; validated at signup by role)
  business_name TEXT,
  vat_number TEXT,

  company_address TEXT,
  origin_country TEXT,

  truck_id TEXT,
  carrier_company TEXT,

  employee_id TEXT,
  branch_office TEXT,

  department TEXT,
  staff_code TEXT,

  approved_by UUID,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

CREATE TABLE IF NOT EXISTS kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- e.g. TRADE_LICENSE, TIN_CERTIFICATE, BUSINESS_REGISTRATION, EXPORT_PERMIT, DRIVERS_LICENSE, VEHICLE_PLATE_REGISTRY, GOV_ID_BADGE, EMPLOYMENT_VERIFICATION
  doc_type TEXT NOT NULL,

  original_file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  size_bytes BIGINT NOT NULL CHECK (size_bytes >= 0),

  -- Stored by backend (filesystem/S3/etc). For now: filesystem path/key.
  storage_key TEXT NOT NULL,

  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_doc_type ON kyc_documents(doc_type);

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS kyc_documents;
DROP TABLE IF EXISTS users;
-- +goose StatementEnd

