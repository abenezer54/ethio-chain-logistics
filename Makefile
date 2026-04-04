COMPOSE = docker compose
ENV_FILE = .env
BACKEND_DIR = backend

.PHONY: up down restart logs ps db-shell db-reset clean \
	backend-tidy backend-run backend-test backend-build backend-migrate-up frontend

up:
	$(COMPOSE) --env-file $(ENV_FILE) up -d

down:
	$(COMPOSE) --env-file $(ENV_FILE) down

restart:
	$(COMPOSE) --env-file $(ENV_FILE) down
	$(COMPOSE) --env-file $(ENV_FILE) up -d

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
	cd $(BACKEND_DIR) && go test ./...

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
