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

Optional: `API_PORT` (default `8080`), `GIN_MODE` (`debug` or `release`).

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
