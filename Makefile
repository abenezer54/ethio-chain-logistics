COMPOSE = docker compose
ENV_FILE = .env
BACKEND_DIR = backend

.PHONY: up down restart logs ps db-shell db-reset clean \
	backend-tidy backend-run backend-test backend-integration-test backend-build backend-migrate-up frontend \
	frontend-test frontend-e2e test test-e2e chapter-six-evidence \
	blockchain-install blockchain-node blockchain-test blockchain-deploy-local

up:
	$(COMPOSE) --env-file $(ENV_FILE) up --build -d

down:
	$(COMPOSE) --env-file $(ENV_FILE) down

restart:
	$(COMPOSE) --env-file $(ENV_FILE) down
	$(COMPOSE) --env-file $(ENV_FILE) up --build -d

logs:
	$(COMPOSE) --env-file $(ENV_FILE) logs -f --tail=200

ps:
	$(COMPOSE) --env-file $(ENV_FILE) ps

db-shell:
	$(COMPOSE) --env-file $(ENV_FILE) exec postgres psql -U $${POSTGRES_USER:-ethio_user} -d $${POSTGRES_DB:-ethio_chain}

db-reset:
	$(COMPOSE) --env-file $(ENV_FILE) down -v
	$(COMPOSE) --env-file $(ENV_FILE) up -d

clean:
	$(COMPOSE) --env-file $(ENV_FILE) down -v --remove-orphans

# Backend (Go)
backend-tidy:
	cd $(BACKEND_DIR) && go mod tidy

backend-run:
	@set -a; test -f $(ENV_FILE) && . ./$(ENV_FILE); set +a; cd $(BACKEND_DIR) && go run ./cmd/api

backend-test:
	cd $(BACKEND_DIR) && GOCACHE=/tmp/ethio-chain-go-cache GOMODCACHE=/tmp/ethio-chain-go-mod go test ./...

backend-integration-test:
	cd $(BACKEND_DIR) && GOCACHE=/tmp/ethio-chain-go-cache GOMODCACHE=/tmp/ethio-chain-go-mod go test -tags=integration ./...

backend-build:
	cd $(BACKEND_DIR) && go build -o bin/api ./cmd/api

GOOSE = go run github.com/pressly/goose/v3/cmd/goose@v3.24.1

backend-migrate-up:
	@set -a; test -f $(ENV_FILE) && . ./$(ENV_FILE); set +a; \
	if [ -z "$$DATABASE_URL" ]; then \
		export DATABASE_URL="postgres://$${POSTGRES_USER:-ethio_user}:$${POSTGRES_PASSWORD:-ethio_pass}@$${POSTGRES_HOST:-localhost}:$${POSTGRES_PORT:-5432}/$${POSTGRES_DB:-ethio_chain}?sslmode=disable"; \
	fi; \
	cd $(BACKEND_DIR) && $(GOOSE) -dir migrations postgres "$$DATABASE_URL" up

# Frontend
frontend:
	@echo "Starting frontend on http://localhost:3000 ..."
	cd frontend && NEXT_PUBLIC_API_BASE=http://localhost:8080 npm run dev

frontend-test:
	cd frontend && npm test

frontend-e2e:
	cd frontend && npm run test:e2e

# Blockchain
blockchain-install:
	cd blockchain && npm install

blockchain-node:
	cd blockchain && npm run node

blockchain-test:
	cd blockchain && HOME=/tmp/ethio-chain-hardhat-home XDG_CONFIG_HOME=/tmp/ethio-chain-hardhat-config XDG_DATA_HOME=/tmp/ethio-chain-hardhat-data npm test

blockchain-deploy-local:
	cd blockchain && npm run deploy:local

test: backend-test blockchain-test frontend-test

test-e2e: frontend-e2e

chapter-six-evidence:
	mkdir -p frontend/test-artifacts/chapter-six
	cd frontend && npm run test:e2e -- --project=chromium
