COMPOSE = docker compose
ENV_FILE = .env

.PHONY: up down restart logs ps db-shell db-reset clean

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
