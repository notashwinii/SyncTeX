# SyncTeX

Real-time collaborative LaTeX editor with offline-first support. Local-first
CRDT sync (Yjs), unrestricted collaboration, live HTML preview, server-side
PDF compilation.

This monorepo supersedes the original `synctex-org/backend` and
`synctex-org/frontend` repositories (their pre-monorepo history lives there).

## Layout

```
apps/api             Go REST API (Gin) — auth, workspaces, projects, storage
apps/web             Next.js frontend — editor (Monaco + Yjs), preview parser
apps/sync            [planned] Hocuspocus document sync service
apps/compile-worker  [planned] sandboxed LaTeX compile workers
packages/shared      [planned] shared TS types + generated API client
infra/               deploy config (Terraform, Caddy)
docs/                project report, production plan, implementation spec, milestones
```

Roadmap: `docs/milestones.md`. Engineering spec: `docs/implementation.md`.
Audit & positioning: `docs/plan.md`.

## Development

Prerequisites: Docker, Go 1.24+, Node 22+.

```sh
# 1. backing services (Postgres, Redis, MinIO with bucket auto-created)
docker compose up -d

# 2. api
cd apps/api
cp .env.sample .env
make migrate-up        # needs goose: go install github.com/pressly/goose/v3/cmd/goose@latest
go run ./cmd/server    # or `air` for hot reload

# 3. web (second terminal)
cd apps/web
npm install
npm run dev
```

App: http://localhost:3000 · API: http://localhost:8080 · Swagger: /swagger/index.html · MinIO console: http://localhost:9001

Everything containerized instead: `docker compose --profile full up`.

## Status

Working prototype under active hardening toward production (see
`docs/milestones.md` — currently M0). Not yet deployed publicly; known
security limitations are catalogued in `docs/plan.md` and are the current
focus of work.
