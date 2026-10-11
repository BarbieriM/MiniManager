# Settings come from .env (git-ignored; copy .env.example). .env beats variables exported in the shell;
# to target another database, pass it on the command line: make migrate DATABASE_URL='postgres://...'
-include .env
export

GOOSE = go tool goose -dir migrations postgres "$(DATABASE_URL)"

.PHONY: dev dev-api dev-web db test lint sqlc migrate-new migrate migrate-status seed

## dev: start the local database, the API with live reload and the Vite dev server
dev: db
	$(MAKE) -j2 dev-api dev-web

dev-api:
	cd api && go tool air

dev-web:
	cd web && corepack yarn dev

## db: start the local Postgres from compose.yaml (does not apply migrations)
db:
	docker compose up -d --wait db

## test: Go tests (need Docker for testcontainers) and web tests
# testcontainers reads DOCKER_HOST; take it from the active docker context (Colima here) unless already set.
# The socket override is the path inside the Docker VM, which testcontainers' reaper container mounts.
test: export DOCKER_HOST ?= $(shell docker context inspect --format '{{.Endpoints.docker.Host}}' 2>/dev/null)
test: export TESTCONTAINERS_DOCKER_SOCKET_OVERRIDE ?= /var/run/docker.sock
test:
	cd api && go test ./...
	cd web && corepack yarn test

## lint: sqlc diff (generated code up to date), go vet, staticcheck, gofmt check, then oxlint and the TypeScript check
lint:
	cd api && go tool sqlc diff
	cd api && go vet ./...
	cd api && go tool staticcheck ./...
	@unformatted="$$(cd api && gofmt -l .)"; \
	if [ -n "$$unformatted" ]; then echo "gofmt needed:"; echo "$$unformatted"; exit 1; fi
	cd web && corepack yarn lint

## sqlc: regenerate Go code from the queries.sql files
sqlc:
	cd api && go tool sqlc generate

## migrate-new name=add_x: create the next numbered migration file
migrate-new:
	@test -n "$(name)" || (echo "usage: make migrate-new name=add_x" && exit 1)
	cd api && go tool goose -dir migrations -s create $(name) sql

## migrate: apply pending migrations to DATABASE_URL (the only command that changes a schema)
migrate:
	cd api && $(GOOSE) up

## migrate-status: list applied and pending migrations for DATABASE_URL
# On a database goose has never seen, this creates goose's empty goose_db_version table (goose does that itself).
migrate-status:
	cd api && $(GOOSE) status

## seed: create the first Admin from SEED_ADMIN_* (refuses if migrations are pending)
seed:
	cd api && go run ./cmd/seed
