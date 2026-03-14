# Ethio Chain Logistics

Ethio Chain Logistics is a multi-service project that will include backend APIs, blockchain components, frontend apps, and infrastructure automation.

This README is the main entry point for setting up and running the project locally as it grows.

## Repository structure

- `backend/`: backend services (planned)
- `frontend/`: web/mobile frontend code (planned)
- `blockchain/`: blockchain network and smart contract resources (planned)
- `infrastructure/`: local/devops infrastructure assets
- `docker-compose.yml`: local shared services
- `Makefile`: common local development commands

## Prerequisites

- Git
- Docker Engine or Docker Desktop
- Docker Compose plugin (`docker compose`)
- `make`

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

## Current local services

### PostgreSQL

- Host (from your machine): `localhost`
- Port: `5432` (or `POSTGRES_PORT` from `.env`)
- Database: `ethio_chain` (default)
- User: `ethio_user` (default)

### pgAdmin

- URL: `http://localhost:5050` (or `PGADMIN_PORT` from `.env`)
- Email: `admin@local.dev` (default)
- Password: `admin123` (default)

To connect pgAdmin to PostgreSQL, register a server with:

- Host name/address: `postgres`
- Port: `5432`
- Username: value of `POSTGRES_USER`
- Password: value of `POSTGRES_PASSWORD`

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

## Notes

- PostgreSQL has a healthcheck (`pg_isready`) so dependent services wait until DB is ready.
- Local DB data is unique per developer machine because Docker volumes are local.
