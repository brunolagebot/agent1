.PHONY: qa check-docker dev-build dev-up prod-build prod-up
qa:
	pre-commit run --all-files || true

check-docker:
	@command -v docker >/dev/null 2>&1 || { echo "docker não encontrado. No macOS, rode scripts/bootstrap_macos.sh"; exit 1; }
	@docker info >/dev/null 2>&1 || { echo "docker daemon indisponível. Inicie o Docker Desktop."; exit 1; }

COMPOSE := $(shell docker compose version >/dev/null 2>&1 && echo "docker compose" || echo docker-compose)

dev-build: check-docker
	$(COMPOSE) -f docker-compose.dev.yml build web

dev-up: check-docker
	$(COMPOSE) -f docker-compose.dev.yml up -d

prod-build: check-docker
	$(COMPOSE) -f docker-compose.prod.yml build web

prod-up: check-docker
	$(COMPOSE) -f docker-compose.prod.yml up -d
