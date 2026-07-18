# SyncTeX API

Go 1.24 REST and WebSocket API for authentication, workspaces, projects,
storage metadata, snapshots, and PDF compilation.

## Run locally

Start the backing services from the repository root, then run the API:

```sh
docker compose up -d
cd apps/api
cp .env.sample .env
make migrate-up
go run ./cmd/server
```

Install Goose before the first migration:

```sh
go install github.com/pressly/goose/v3/cmd/goose@v3.26.0
```

The API listens on `http://localhost:8080` by default. Swagger is available
at `/swagger/index.html`; `/healthz` is the liveness probe and `/readyz`
checks database readiness.

## Checks

```sh
gofmt -w .
go vet ./...
go test -race ./...
go build ./...
```

Create migrations with `make migrate-new name=descriptive_name`.

Database access is being migrated incrementally to sqlc-generated `pgx/v5`
queries. After changing `sqlc.yaml`, migrations, or SQL files under
`internal/db/query`, regenerate the committed package:

```sh
make sqlc-generate
```

CI reruns generation and fails when `internal/db` is stale.
