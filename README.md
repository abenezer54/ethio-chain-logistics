# Ethio Chain Logistics

Ethio Chain Logistics is a multi-service project that will include backend APIs, blockchain components, frontend apps, and infrastructure automation.

This README is the main entry point for setting up and running the project locally as it grows.

## Repository structure

- `backend/`: Go API (Gin, Clean Architecture) — see [backend/README.md](backend/README.md)
- `frontend/`: Next.js web app — see [frontend/README.md](frontend/README.md)
- `blockchain/`: blockchain network and smart contract resources (planned)
- `infrastructure/`: local/devops infrastructure assets
- `docker-compose.yml`: local Docker development stack for Postgres, migrations, and the Go API
- `Makefile`: common local development commands

## Prerequisites

- Git
- Docker Engine or Docker Desktop
- Docker Compose plugin (`docker compose`)
- `make`
- [Go 1.23+](https://go.dev/dl/) (for the API on your host)

## Quick start

1. Clone the repository:

```bash
git clone https://github.com/abenezer54/ethio-chain-logistics.git
cd ethio-chain-logistics
```

1. Create your local environment file:

```bash
cp .env.example .env
```

1. Start local services:

```bash
make up
```

1. Check service health:

```bash
make ps
```

1. Follow logs when troubleshooting:

```bash
make logs
```

Stop log streaming with `Ctrl + C`.

## Dev Stack With Docker

The single Compose file runs PostgreSQL, a one-shot migrations container, and the Go API:

```bash
docker compose up --build -d
```

- Backend: `http://localhost:8080`
- Health: `GET http://localhost:8080/health`

The database is published on `localhost:${POSTGRES_PORT}` and defaults to `5432`. If that port is
already in use on your machine, change `POSTGRES_PORT` in `.env`.

## Backend API (Go)

With Postgres running (`make up`) and `.env` created from `.env.example` (includes `DATABASE_URL`):

```bash
make backend-run
```

- Health: `GET http://localhost:8080/health`
- Readiness (DB ping): `GET http://localhost:8080/ready`
- API root: `GET http://localhost:8080/api/v1`
- Importer shipments:
  - `GET /api/v1/importer/shipments`
  - `POST /api/v1/importer/shipments`
  - `GET /api/v1/importer/shipments/:id`
  - `POST /api/v1/importer/shipments/:id/documents`
  - `GET /api/v1/importer/shipments/:id/documents/:docID/download`

Other targets: `make backend-test`, `make backend-build`, `make backend-migrate-up`. Details: [backend/README.md](backend/README.md).

## Current local services

### PostgreSQL

- Host (from your machine): `localhost`
- Port: `5432` (or `POSTGRES_PORT` from `.env`)
- Database: `ethio_chain` (default)
- User: `ethio_user` (default)

Use `postgres` as host for tools running inside Docker. Use `localhost` for tools running directly on your machine.

## Common commands

- `make up`: start services in detached mode
- `make down`: stop and remove services
- `make restart`: recreate services
- `make ps`: show service status
- `make logs`: follow service logs
- `make db-shell`: open `psql` in the PostgreSQL container
- `make db-reset`: recreate DB from scratch (removes local DB volume)
- `make clean`: remove services, volumes, and orphans
- `make backend-run` / `backend-test` / `backend-build` / `backend-migrate-up`: Go API (see [backend/README.md](backend/README.md))

## Notes

- PostgreSQL has a healthcheck (`pg_isready`) so dependent services wait until DB is ready.
- Local DB data is unique per developer machine because Docker volumes are local.
