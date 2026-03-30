-- +goose Up
-- +goose StatementBegin
-- Existing deployments may have been created when status only allowed PENDING/ACTIVE.
-- Drop any check constraint on users.status and replace with the full set.

DO $$
DECLARE
  cname text;
BEGIN
  FOR cname IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'users'
      AND con.contype = 'c'
      AND pg_get_constraintdef(con.oid) LIKE '%status%'
  LOOP
    EXECUTE format('ALTER TABLE users DROP CONSTRAINT %I', cname);
  END LOOP;
END $$;

ALTER TABLE users ADD CONSTRAINT users_status_check
  CHECK (status IN ('PENDING', 'ACTIVE', 'DENIED', 'INFO_REQUIRED'));

-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Intentionally no-op: downgrading would fail if any DENIED/INFO_REQUIRED rows exist.
SELECT 1;
-- +goose StatementEnd
