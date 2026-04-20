# Backend (Go API)

Clean Architecture layout:

- `cmd/api` — composition root
- `internal/domain` — entities and domain errors
- `internal/usecase` — application services and port interfaces
- `internal/delivery/controller` — Gin routes, handlers, middleware
- `internal/repository` — Postgres implementations of ports
- `migrations` — SQL migrations for [goose](https://github.com/pressly/goose)

## Prerequisites

- Go 1.23+
- Running PostgreSQL (e.g. root `make up`)

## Configuration

Set `DATABASE_URL`, or set `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_DB`, and optionally `POSTGRES_HOST` (default `localhost`), `POSTGRES_PORT` (default `5432`).

Optional: `API_PORT` (default `8080`), `GIN_MODE` (`debug` or `release`), `JWT_SECRET`,
`UPLOAD_DIR`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`.

## Run

From repository root:

```bash
make backend-run
```

Or from `backend/`:

```bash
go run ./cmd/api
```

## Migrations

```bash
make backend-migrate-up
```

Requires `goose` via `go run` (see root Makefile).

## Endpoints

- `GET /health` — liveness
- `GET /ready` — readiness (Postgres ping)
- `GET /api/v1` — API metadata

### Auth

- `POST /api/v1/auth/signup` — role registration with required KYC uploads
- `POST /api/v1/auth/login` — login for active users

### Admin

Admin routes require a bearer token for an `ADMIN` user.

- `GET /api/v1/admin/pending-approvals`
- `GET /api/v1/admin/users/:id/docs`
- `GET /api/v1/admin/docs/:docID/download`
- `POST /api/v1/admin/users/:id/approve`
- `POST /api/v1/admin/users/:id/deny`
- `POST /api/v1/admin/users/:id/request-info`

### Importer shipments

Importer routes require a bearer token for an active `IMPORTER` user.

- `GET /api/v1/importer/shipments` — list shipments owned by the current importer
- `POST /api/v1/importer/shipments` — create a shipment in `INITIATED` status
- `GET /api/v1/importer/shipments/:id` — view shipment detail, documents, and audit events
- `POST /api/v1/importer/shipments/:id/documents` — upload shipment documents
- `GET /api/v1/importer/shipments/:id/documents/:docID/download` — download one shipment document

Create shipment request:

```json
{
  "origin_port": "Djibouti Port",
  "destination_port": "Modjo Dry Port",
  "cargo_type": "Electronics",
  "weight_kg": "1200",
  "volume_cbm": "18.5",
  "seller_id": "optional-user-id"
}
```

Document upload expects `multipart/form-data`. Supported file fields:

- `bill_of_lading`
- `commercial_invoice`
- `letter_of_credit`
- `supplemental`

The API stores uploads under `UPLOAD_DIR`, computes a SHA-256 hash for each document, records
document verification status as `PENDING`, and appends shipment audit events. Once both Bill of
Lading and Commercial Invoice are present, the shipment moves from `INITIATED` to
`DOCS_UPLOADED`.

The shipment schema includes blockchain-readiness fields such as `anchor_status`,
`blockchain_tx_hash`, `ipfs_cid`, `event_hash`, and `previous_event_hash`. Real blockchain/IPFS
anchoring is not implemented yet.
