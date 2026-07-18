# SyncTeX — Production Implementation Specification

This is the engineering spec for taking SyncTeX to production. Unlike `plan.md` (the audit), this document makes the architectural **decisions** and defines what gets built, rewritten, or deleted. Where the current code is named, the instruction is definitive.

Decisions here are final unless a blocking constraint is discovered; do not re-litigate them per-PR.

---

## 0. Target Architecture

Five services behind one origin. Cookie-based auth works everywhere because everything is same-site.

```
                        ┌────────────────────────────┐
  app.synctex.org ──────►  Edge proxy (Caddy)        │
                        │  TLS, HTTP/2, WS upgrade   │
                        └──────┬──────────┬──────────┘
                               │          │
                 /api/*, /ws-ticket       │ /sync/* (WebSocket)
                               │          │
                    ┌──────────▼───┐  ┌───▼──────────────┐
                    │ api (Go/Gin) │  │ sync (Hocuspocus) │
                    │ REST, authz, │  │ Yjs authority,    │
                    │ jobs enqueue │  │ awareness, persist│
                    └──┬───┬───┬───┘  └───┬───────┬──────┘
                       │   │   │          │       │
        ┌──────────────▼┐ ┌▼───▼──────┐ ┌─▼───────▼─┐
        │ compile-worker│ │ Postgres  │ │  Redis     │
        │ (Go + asynq,  │ │ (Neon)    │ │ queue+pubsub│
        │  TeX sandbox) │ └───────────┘ │ +ratelimit │
        └──────┬────────┘               └────────────┘
               │
        ┌──────▼────────┐     ┌──────────────────────┐
        │ S3 (Backblaze)│     │ web (Next.js, static/ │
        │ assets + PDFs │     │ SSR via proxy)        │
        └───────────────┘     └──────────────────────┘
```

**Decisions:**

| Concern | Decision | Rationale |
|---|---|---|
| Doc sync server | **Hocuspocus** (TypeScript, Tiptap's production Yjs server) with `@hocuspocus/extension-redis` and a custom Postgres persistence extension | Correct y-protocol implementation, auth hooks, horizontal scaling via Redis — building a y-crdt server in Go from scratch is 3+ months of protocol risk for zero product value |
| Compile execution | Dedicated **compile-worker** Go service consuming an **asynq** (Redis) queue; each job runs `latexmk` inside a per-job container sandbox | Compilation must never share a failure domain or kernel namespace with the API |
| Topology | Single origin (`app.synctex.org`), path-routed by Caddy | Kills the CORS/SameSite/WS-auth class of bugs permanently |
| Deploy target | Docker images, deployed as containers (Fly.io machines or ECS — pick at infra setup; the spec is orchestrator-agnostic), Terraform-managed, GitHub Actions CD | |
| State | Postgres = source of truth for accounts/metadata/doc snapshots; Redis = queue, pub/sub, rate limits, WS tickets; S3 = binary assets and compiled PDFs | |
| Repo | Monorepo: `apps/web`, `apps/api`, `apps/sync`, `apps/compile-worker`, `packages/shared` (TS types + OpenAPI-generated client), `packages/mcp` (agent access, §13), `infra/` | |
| AI strategy | **BYO-agent via MCP** (§13): expose the editing/compile surface to any MCP client; build no in-product assistant | Zero inference cost, no model race; our CRDT + structured-error architecture is the differentiator, not a chatbot |

### 0.1 Full tech stack — every choice with its why

Rule for this table: if a choice can't defend itself in one sentence against its strongest alternative, it isn't a decision yet.

| Layer | Choice | Why (vs. the strongest alternative) |
|---|---|---|
| API language | **Go** | Static binary, tiny memory footprint, first-class concurrency for connection-heavy work; the existing backend is already Go — rewriting working CRUD into another language is negative-value work |
| API framework | **Gin** (kept) | Already in use and mature; the framework is not where this product differentiates, so switching (chi, echo) buys churn, not capability |
| Query layer | **sqlc** | SQL stays visible and reviewable but columns/types are checked at compile time; ORMs (GORM) hide queries behind reflection and produce the N+1s you discover in production |
| Frontend | **Next.js + TypeScript** (kept) | Already in use; App Router gives static + SSR flexibility; self-hostable (no Vercel lock-in); the team knows it |
| Editor | **Monaco** (kept) | VS Code's engine: proven on huge files, and `y-monaco` gives us CRDT binding for free; CodeMirror 6 is the credible alternative but has no advantage worth a migration |
| CRDT | **Yjs** | The most mature CRDT ecosystem by far — y-monaco, y-indexeddb, Hocuspocus all exist because of it; Automerge is elegant but its ecosystem would have us building every binding ourselves |
| Sync server | **Hocuspocus (Node/TS)** | Only production-grade Yjs server; auth hooks, read-only connections, Redis horizontal scaling built in; a from-scratch Go y-protocol server is months of correctness risk with zero product upside (§3) |
| Math preview | **KaTeX** (kept) | Synchronous, fast, works offline; MathJax's async pipeline and size are the wrong trade for keystroke-latency preview |
| Database | **PostgreSQL (Neon)** | Membership/authz is relational integrity work; Neon adds PITR and branch-per-CI-run without ops burden; NoSQL buys nothing here and costs us transactions |
| Client storage | **IndexedDB** (via y-indexeddb) | The only browser store that handles binary CRDT updates at MB scale; localStorage is 5MB of strings |
| Queue / pub-sub / rate limits / tickets | **Redis** (one instance, four jobs) | Operational simplicity for a 4-person team: one well-understood system instead of RabbitMQ + a limiter + a ticket store; failure posture defined in §0 |
| Job framework | **asynq** | Redis-backed, Go-native, retries/uniqueness/scheduling built in; hand-rolling queue semantics on raw Redis is how jobs get lost |
| Object storage | **S3 API (Backblaze B2; MinIO in dev)** | Presigned URLs take file bytes off our API entirely; B2 is the cheap-egress S3-compatible option; MinIO gives dev/CI parity with zero cloud dependency |
| Compiler | **TeX Live full + latexmk** | latexmk is the canonical build orchestrator (multi-pass, bibtex/biber, dependency tracking) — gotex's fixed two-pass can't do bibliographies; full TeX Live means "missing package" support tickets don't exist |
| Sandbox | **Per-job containers** (no network, tmpfs, cgroups) | TeX is a programming language; the only safe posture is assuming the input is hostile (§5) |
| Edge | **Caddy** | Automatic TLS/ACME and WS proxying in ~20 lines of config; nginx does the same with 10× the config surface and manual cert plumbing |
| IaC / CI / CD | **Terraform + GitHub Actions** | Industry defaults with the largest talent/answer pool; a 4-person team should spend novelty budget on the product, not the pipeline |
| E2E tests | **Playwright** | The offline/reconnect flagship test *requires* scriptable network emulation and multi-context browsers — Playwright's home turf |
| Integration tests | **testcontainers (Postgres, Redis, MinIO)** | Tests run against real dependencies; mocks of databases verify your assumptions, not your system |
| Load tests | **k6** | Load scenarios as versioned code in the repo, runs in CI |
| Observability | **zerolog/pino + Prometheus + OpenTelemetry + Sentry** | Boring, standard, self-hostable; each is the de-facto default of its niche — observability is the last place to be creative |
| MCP server | **TypeScript (`packages/mcp`)** | Reuses the Hocuspocus provider client and generated OpenAPI client directly; the MCP SDK ecosystem is TS-first |

### 0.2 Why a monorepo

A monorepo is one git repository holding all deployables (`apps/web`, `apps/api`, `apps/sync`, `apps/compile-worker`) and shared code (`packages/shared`, `packages/mcp`, `packages/latex-language`) with `infra/` beside them — as opposed to a polyrepo (one repository per service, like the current `backend/`/`frontend` split with separate READMEs pointing at separate GitHub repos).

Why it's the right call here:

1. **Atomic cross-service change.** Almost every meaningful feature in this system touches ≥2 services (an API route + its generated client + the UI; a sync protocol change + the editor hook). In a monorepo that's one PR, one review, one revert. In a polyrepo it's a choreography of dependent PRs that can land half-way.
2. **Contract drift becomes impossible, not just discouraged.** The OpenAPI-generated TS client (§8) and shared types live in `packages/shared`; CI regenerates and type-checks them against both producer and consumers in the same run. Polyrepos do this with published package versions — which is exactly how the current codebase ended up with hand-written endpoint files that silently disagree with the backend.
3. **One CI, one set of quality gates.** The §2 authz matrix, §5 sandbox suite, and §10 e2e all test *the composition* of services; a single repo is the natural home for tests whose subject is the whole system.
4. **Team-size fit.** Repo boundaries are organizational boundaries; four people don't have any. The known monorepo costs (build tooling complexity, CI selectivity at scale, access partitioning) are problems of hundreds of engineers, none of which we have.

The costs we accept knowingly: slightly heavier CI runs (mitigated by path-filtered jobs) and mixed-language tooling in one tree (Go + TS; handled by per-app Makefiles/turbo tasks, no unified build system needed at this size).

The current `backend/` becomes `apps/api`. The current WebSocket package (`backend/internal/handlers/websocket/`) is **deleted entirely** — it is not upgraded, it is replaced by the sync service.

**Failure posture (Redis wears four hats — queue, pub/sub, rate limits, tickets — so its outage mode is defined here, not discovered in an incident):**
- Redis runs with AOF persistence (`appendfsync everysec`); queued compile jobs survive a restart.
- Redis down: login and REST reads continue; the rate limiter **fails open** (with a page-level alert — brief unthrottled window beats full outage); WS tickets and compile enqueue **fail closed** with 503 and an explicit client banner; established sync connections continue with instance-local fanout (cross-instance rooms may briefly split — Yjs converges on resync; accepted for short outages).
- Sync down: clients keep editing against IndexedDB and resync on recovery; compile returns 503 (it requires materialized text, §5.2).

---

## 1. Identity & Sessions (apps/api)

### 1.1 What's wrong now
- Refresh tokens are stateless JWTs; `TokenID` is generated (`authServices/jwt.go:64`) but stored nowhere → no revocation, 30-day theft window.
- Tokens accepted from query string (`middleware/auth.go:29`) → log/history leakage.
- No email verification, no password reset, no session invalidation on password change.
- `rand.Read` error ignored; cookies set without SameSite; debug `fmt.Printf` in the auth middleware.

### 1.2 Implementation

**Token model — access JWT + opaque rotating refresh token.**
- Access token: JWT, HS256 → migrate to **EdDSA (Ed25519)** so the sync service can verify tokens with a public key without sharing the signing secret. TTL **10 minutes**. Claims: `sub` (user id), `sid` (session id), `exp`, `iat`. Username is not a claim — display data comes from the DB.
- Refresh token: **opaque 256-bit random**, stored hashed (SHA-256) in Postgres. Rotation on every use; reuse of a rotated token revokes the whole session family (theft detection).

```sql
CREATE TABLE auth_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  refresh_hash  BYTEA NOT NULL,          -- SHA-256 of current refresh token
  parent_hash   BYTEA,                   -- previous token in the family (reuse detection)
  user_agent    TEXT,
  ip            INET,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at    TIMESTAMPTZ NOT NULL,    -- 30 days sliding
  revoked_at    TIMESTAMPTZ
);
CREATE UNIQUE INDEX ON auth_sessions(refresh_hash);
CREATE INDEX ON auth_sessions(user_id) WHERE revoked_at IS NULL;
```

- Cookies (set by api, scoped to the single origin): `st_access` (10 min) and `st_refresh` (30 d, path=`/api/auth`) — both `HttpOnly; Secure; SameSite=Lax`. No tokens in JSON responses, no localStorage, ever. Delete the `TokenResponse` body from login/refresh handlers.
- `POST /api/auth/refresh`: validate → rotate (single UPDATE with `WHERE refresh_hash = $1 AND revoked_at IS NULL AND expires_at > now()`); on 0 rows and a matching `parent_hash`, revoke session and return 401 `SESSION_COMPROMISED`.
- **Multi-tab race protection:** rotation keeps a **60-second grace window** — a refresh presenting the immediately-previous token (`parent_hash` match) within 60s of rotation (`rotated_at` column) returns the *same* successor token instead of tripping revocation. Reuse detection applies only outside the window. Without this, two tabs refreshing concurrently would false-positive as theft and log the user out.
- Password change / reset / account-level "log out everywhere": `UPDATE auth_sessions SET revoked_at = now() WHERE user_id = $1`. Access-token revocation latency is bounded by the 10-minute TTL — accepted.
- The existing `sessions` and `collaborations` tables are **dropped** (migration). `auth_sessions` and Hocuspocus awareness replace them.

**Account lifecycle:**
- Email verification: `user_tokens(id, user_id, purpose ENUM('verify_email','reset_password'), token_hash, expires_at, used_at)`; 24h TTL for verify, 30min for reset. Unverified accounts can log in but cannot create workspaces or accept invitations (enforced in authz layer). Emails normalized: `lower(trim(email))` with a `CITEXT` column type; add migration converting `users.email` to `citext`.
- Password reset invalidates all `auth_sessions` for the user.
- Email change: the new address must be verified (`user_tokens`, `purpose='change_email'`) before it replaces the old; a notification goes to the **old** address (account-takeover tripwire); sessions persist.
- Account deletion: refuse while the user owns workspaces with other members ("transfer or delete first"); otherwise soft-delete (`users.deleted_at`), anonymize email/username, revoke sessions. **Remove `ON DELETE CASCADE` from `workspaces.owner_id`** (migration: `ON DELETE RESTRICT`).

**Middleware (`internal/httpmw/auth.go`, replaces `internal/middleware/auth.go`):**
- Source: `st_access` cookie only. Delete Bearer-header and query-param paths. Programmatic access (MCP, scripts) uses scoped PATs (§13) with a distinct `Bearer st_pat_…` path — never this JWT.
- Parse with Ed25519 public key, `jwt.WithValidMethods`, leeway 30s. Set `userID`, `sessionID` in context. No logging of token material.

### 1.3 WS authentication (ticket flow)
Hocuspocus connections authenticate with a one-time ticket, not the session cookie (avoids long-lived cookie replay into WS and lets sync stay stateless w.r.t. auth):

- `POST /api/ws-ticket {projectId}` → api verifies project access (see §2), writes `ticket:<random256>` to Redis with value `{userId, projectId, role}` and **30s TTL, single use** (GETDEL on redeem) → returns ticket.
- Client passes the ticket as the Hocuspocus `token` parameter. Sync's `onAuthenticate` hook redeems it via Redis GETDEL; rejects if absent. The redeemed context `{userId, projectId, role}` is attached to the connection; `role === 'viewer'` sets the connection read-only (Hocuspocus supports this natively).
- Membership revocation: api publishes `revoke:{projectId}:{userId}` on Redis pub/sub; sync subscribes and closes matching connections within 1s.
- The same channel carries session death: api publishes `revoke-user:{userId}` whenever `auth_sessions` rows are revoked (logout, password change, admin disable) — a logged-out user must not keep a live editing socket.

### 1.4 Acceptance criteria
- Stolen refresh token becomes useless after the legitimate client's next refresh; reuse trips family revocation (integration test).
- No token appears in any log line, URL, response body, or non-HttpOnly cookie (grep + proxy assertion in e2e).
- Password reset kills concurrent sessions across two browsers (e2e).

---

## 2. Authorization (apps/api)

### 2.1 What's wrong now
`snapshotHandlers`, `downloadHandlers`, `storageHandlers` (upload/tree/signed-url), and the WS route perform **no membership check** — any authenticated user can read/write any project by UUID.

### 2.2 Implementation
Single authorization layer; handlers never query membership ad hoc.

```go
// internal/authz/authz.go
type Role int // RoleViewer < RoleEditor < RoleAdmin < RoleOwner

func ProjectRole(ctx, pool, userID, projectID) (Role, error)   // one JOIN query
func WorkspaceRole(ctx, pool, userID, workspaceID) (Role, error)

// internal/httpmw/access.go — route middleware
RequireProject(minRole Role)    // reads :id, resolves role, stores in context
RequireWorkspace(minRole Role)
```

Route → minimum role matrix (enforced in `router.go`, tested exhaustively):

| Route | Min role |
|---|---|
| `GET /projects/:id`, `/tree`, `/snapshot`, `GET /projects/:id/files/*` | viewer |
| `PUT /projects/:id/snapshot` (internal, see §3), uploads, compile, file CRUD | editor |
| `DELETE /projects/:id`, project settings | admin |
| Workspace member add/remove, role change | admin (owner required to change admins) |
| Workspace delete, ownership transfer | owner |

- Roles live in `workspace_members.role` — migrate the free-text `VARCHAR(32)` to `role_enum ('viewer','editor','admin','owner')` with a data migration mapping existing values; exactly one `owner` row per workspace enforced by partial unique index.
- `GET /users/email/:email` is deleted. User search (`/users/search`) requires min 3 chars, returns only username + avatar, rate-limited (§7), and is the only lookup surface.
- Errors: uniform `404` for "not found" and "no access" on reads (no existence oracle); `403` on writes where the resource is already known to the caller.

### 2.3 Acceptance criteria
A table-driven integration test iterates **every** authenticated route × {non-member, viewer, editor, admin, owner, unauthenticated} and asserts the matrix. CI fails if a new route is added without a matrix entry (route-walker test enumerates gin routes).

---

## 3. Document Sync (apps/sync — new service)

### 3.1 What's wrong now
`backend/internal/handlers/websocket/` relays raw frames with a 512-byte cap, speaks no y-protocol, holds no document state, and persists nothing. `BaseEditor.tsx` builds an invalid WS URL, reads a token that is never set, races a 1-second timer to inject default content, and never tears down providers. None of this is upgraded — it is replaced.

### 3.2 Implementation

**Service:** Node 22 + TypeScript, Hocuspocus server.

```ts
// apps/sync/src/server.ts (shape)
const server = Server.configure({
  extensions: [
    new Redis({ /* horizontal scaling: inter-instance doc sync + awareness */ }),
    new PostgresPersistence(),   // custom, below
    new Logger(), new Metrics(), // §9
  ],
  async onAuthenticate({ token, documentName }) {
    const ctx = await redeemTicket(token);          // §1.3, Redis GETDEL
    const { projectId, fileId } = parseDocName(documentName); // "p:<uuid>:f:<uuid>"
    if (ctx.projectId !== projectId) throw new Forbidden();
    return { userId: ctx.userId, readOnly: ctx.role === 'viewer' };
  },
});
```

**Document naming:** one Yjs doc per file: `p:<projectId>:f:<fileId>`. Plus one metadata doc per project `p:<projectId>:meta` holding the file tree as a `Y.Map` (id → {name, parentId, kind, order}) so tree edits are collaborative and offline-capable like text. **All structural mutations (create/rename/move/delete/reorder) are API-authoritative:** REST validates against `project_files` (uniqueness, reserved names, no `parent_id` cycles), commits, then applies the change to the meta-doc via `POST /sync/internal/apply` (shared-secret header). Clients never write the meta-doc — it is a real-time read model. This is deliberate: a client-collaborative CRDT tree cannot be reconciled with the DB's uniqueness and acyclicity invariants (two offline users renaming different files to the same name would converge to an invalid state with no principled loser). Consequence, stated as product truth: **file structure cannot be changed offline** — text editing is fully offline, structural actions are disabled while disconnected, and the UI says so.

**Persistence (custom extension, `PostgresPersistence`):**

```sql
CREATE TABLE doc_updates (           -- append-only update log
  id         BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  doc_name   TEXT NOT NULL,
  update     BYTEA NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON doc_updates(doc_name, id);

CREATE TABLE doc_snapshots (         -- compacted state, one row per doc
  doc_name    TEXT PRIMARY KEY,
  state       BYTEA NOT NULL,        -- Y.encodeStateAsUpdate
  state_vector BYTEA NOT NULL,
  compacted_through BIGINT NOT NULL, -- last doc_updates.id folded in
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

- `onLoadDocument`: snapshot + replay updates `> compacted_through`.
- `onStoreDocument` (debounced 2s / max 10s by Hocuspocus): append incremental update to `doc_updates`.
- Compaction job (in-service, per-doc mutex via Redis): when a doc has >500 pending updates or >5MB log, fold into `doc_snapshots`, delete folded rows in the same transaction. Named version history (§6.4) reads from this log before deletion by copying cut-points into `doc_versions`.
- The legacy `snapshots` table and both snapshot REST endpoints are **deleted**. Migration: for each project with a legacy snapshot, decode state → write into `doc_snapshots` under the project's initial `main.tex` file doc.

**Limits & protocol hygiene:** max message 15MB (initial sync of large docs), per-doc size cap 25MB (reject updates beyond it with a typed close code the client surfaces as "document too large"), awareness fan-out throttled to 50ms, connection idle timeout 60s with ping/pong (Hocuspocus defaults, tuned in config).

**Deploys:** sync handles SIGTERM by refusing new connections, flushing every pending `onStoreDocument`, then exiting; rolling deploy one instance at a time. The 2s persistence debounce must never intersect a kill — this is a CI-tested shutdown path, not an ops convention.

**Default content:** created by api at project creation — api builds a Y.Doc server-side? No: api calls a small sync endpoint `POST /sync/internal/seed {docName, template}` (shared-secret) where the **sync service** constructs the Y.Doc and persists it before the project-create response returns. The client-side `setTimeout` template injection in `BaseEditor.tsx` is deleted.

### 3.3 Client (apps/web)
Rewrite the editor data layer as a `useCollabDoc(projectId, fileId)` hook:

- `Y.Doc` + `HocuspocusProvider` (`url: wss://app.synctex.org/sync`, `token: ticket`, `name: p:…:f:…`) + `IndexeddbPersistence(docName, doc)` — note the key is per-file, not per-project.
- Ticket fetch on (re)connect via `onAuthenticate` token callback; provider handles backoff (configure `maxAttempts: ∞`, exponential with jitter, cap 30s).
- Full teardown on unmount: `binding.destroy(); provider.destroy(); idb.destroy(); doc.destroy()` — in that order, in a `useEffect` cleanup; StrictMode double-mount safe.
- Text type: `doc.getText('content')` (constant in `packages/shared`). `"monacotest"` dies.
- Connection state machine exposed to UI: `offline (idb only) → connecting → syncing → live`, plus `readonly` and `kicked` (server close codes). No `console.log`.
- Terminal close codes (`kicked`, `doc-too-large`, `project-deleted`) open a recovery dialog offering **local export** — serialize the IndexedDB doc state to a `.tex` download — before the local copy is discarded. Offline work is never silently trapped, including for users removed from a workspace while holding unsynced edits.
- IndexedDB unavailability (Firefox private mode, quota errors): catch at provider init, continue memory-only, surface a persistent banner "offline persistence unavailable". This is explicit UX, not a silent fallback.
- Single canonical editor route `app/projects/[projectId]/editor`; `app/editor/` is deleted.

### 3.4 Acceptance criteria
- Two-browser e2e: concurrent typing converges; kill sync service mid-edit, restart, both clients resync with zero loss.
- Offline e2e (Playwright network emulation): edit offline 5 min, reconnect, merge with a peer's concurrent edits; no duplicated template content.
- 2MB single-paste syncs; 20MB doc loads under 3s from snapshot; viewer connection cannot mutate (server-enforced, asserted at the protocol level).
- Removing a member closes their socket within 1s and their next ticket request 403s.

---

## 4. Multi-File Projects (api + sync + web)

### 4.1 What's wrong now
One implicit text buffer per project; `project_files` (uploads) has no migration; the tree is uploads-only; PDF compile receives whatever string the client posts.

### 4.2 Implementation

**Data model (new migration set):**

```sql
CREATE TYPE file_kind AS ENUM ('tex','bib','cls','sty','asset','folder');

CREATE TABLE project_files (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id  UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES project_files(id) ON DELETE CASCADE,
  name        TEXT NOT NULL CHECK (name ~ '^[^/\\:*?"<>|]{1,255}$' AND name NOT IN ('.','..')),
  kind        file_kind NOT NULL,
  object_key  TEXT,            -- assets only (S3); NULL for editable/folder
  size_bytes  BIGINT,
  content_type TEXT,
  created_by  UUID NOT NULL REFERENCES users(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at  TIMESTAMPTZ,
  UNIQUE (project_id, parent_id, name) WHERE deleted_at IS NULL
);
ALTER TABLE projects ADD COLUMN main_file_id UUID REFERENCES project_files(id);
```

- Editable files (`tex/bib/cls/sty`) have their content in Yjs docs (§3); assets live in S3 under `projects/<projectId>/assets/<fileId>` — object keys are server-generated UUID paths, never user filenames.
- File CRUD is REST on api (`POST/PATCH/DELETE /projects/:id/files…`), which updates the DB row and mirrors structural changes into the project meta-doc (§3.2). Deletes are soft (`deleted_at`) with a 30-day purge job that also deletes S3 objects and Yjs doc rows.
- Filename hygiene beyond the CHECK constraint (app-level, shared validator): NFC-normalize before validation and uniqueness (macOS NFD vs NFC collisions); reject Windows-reserved basenames (`CON`, `PRN`, `AUX`, `NUL`, `COM1–9`, `LPT1–9`, case-insensitive, with or without extension) so project zip exports extract everywhere; moves validate acyclicity by walking `parent_id` server-side (a folder can never become its own descendant).
- Deleting or converting the file referenced by `projects.main_file_id` returns 409 until a new main file is designated — no dangling compile entry point.
- Project deletion: background job purges S3 prefix + `doc_updates`/`doc_snapshots` rows. No orphans.

**Uploads (rewrite of `storageHandlers`):**
- Two-phase: `POST /projects/:id/files:initiate-upload {name, size, contentType}` → validates (size ≤ 50MB/file, project quota 500MB, content-type allowlist: `image/png|jpeg|svg+xml|pdf`, `font/*` for cls users later) → returns presigned S3 PUT URL + fileId; `POST …/files/:fileId:complete` verifies the object exists with expected size via HEAD, then commits the row + meta-doc entry. API never proxies file bytes.
- Downloads: presigned GET URLs, 15-min TTL, issued only through `RequireProject(viewer)`.
- Server-side MIME sniff on complete (first 512 bytes via ranged GET) must match declared type, else the object is deleted and the upload rejected.

### 4.3 Acceptance criteria
- Tree operations (create/rename/move/delete) propagate live to a second client and survive offline/reconnect.
- Upload of a renamed executable (`.png` that sniffs as ELF) is rejected and leaves no S3 object or DB row.
- Deleting a project leaves zero S3 objects and zero doc rows after the purge job runs (integration test against MinIO).

---

## 5. Compilation Pipeline (apps/compile-worker — new service)

### 5.1 What's wrong now
`downloadServices/download.go` runs host `pdflatex` via gotex on client-posted strings — unsandboxed, untimed, unauthorized, compiles content unrelated to the project, logs document text, and the deploy image doesn't even contain TeX. Hardcoded pseudo-validation (`\ima`). All deleted.

### 5.2 Implementation

**Queue:** asynq (Redis). Task `compile:project` payload `{jobId, projectId, mainFileId, requestedBy, docFingerprint}`.

**API surface:**
- `POST /api/projects/:id/compile` (editor role) → snapshots inputs (see below), enqueues, returns `{jobId}`. Per-project dedupe: if an identical `docFingerprint` job is queued/running, return that job. Per-user limits: 1 concurrent, 30/hour (§7).
- `GET /api/projects/:id/compile/:jobId` → `{status: queued|running|succeeded|failed, queuePosition, log?, pdfUrl?, errors?: [{file, line, message, severity}]}`. Client polls at 1s at launch volume (bounded by §7 limits); replace with push over a compile-status channel on the project meta-doc before GA scale-up — tracked as explicit debt, not an aspiration.

**Input staging (consistency):** the api resolves the project tree, pulls each editable file's **current materialized text** from the sync service (`GET /sync/internal/text?doc=…`, shared-secret; Hocuspocus reads from loaded doc or persistence), computes `docFingerprint = sha256(all file contents + tree)`, and writes a job bundle to S3 (`jobs/<jobId>/input.tar.zst`: tex sources + assets). Compiles are therefore reproducible artifacts of a specific state, immune to mid-compile edits.

**Worker execution:**
- Base image: `texlive/texlive:latest-full` pinned by digest, updated monthly via CI.
- Each job runs in a fresh container (worker talks to the container runtime; on Fly/ECS this is a pre-warmed pool of sandbox containers, one job at a time each) with: no network, read-only root, `/job` tmpfs sized at **1.5GB** (2× the 500MB project quota plus output headroom — staging must never fail for a quota-compliant project), non-root uid, `pids=256`, `cpu=1`, `mem=1GB`, wall-clock timeout 120s (SIGKILL).
- Command: `latexmk -pdf -interaction=nonstopmode -halt-on-error -no-shell-escape -output-directory=/job/out /job/src/<main.tex>` with `openin_any=p openout_any=p TEXMFVAR=/job/texmf` env. latexmk handles multi-pass + bibtex/biber automatically — this is why it replaces gotex's fixed `Runs: 2`.
- `-no-shell-escape` is a **hard product decision**, not a default: packages that require shell escape (`minted`, TikZ externalization, `gnuplot` terminals) are unsupported, the structured error surface says so by name and suggests alternatives (`listings` for `minted`). There is no "trusted user" shell-escape tier — that tier would be the vulnerability.
- Output: PDF ≤ 100MB → S3 `projects/<id>/builds/<jobId>.pdf` (30-day retention lifecycle rule); full log → S3 alongside.
- **Log parsing:** structured parser (port of latexmk/texfot heuristics) producing `{file, line, message, severity}` — this feeds Monaco markers in the editor. Parser is a pure Go package with a golden-file test corpus (missing package, undefined control sequence, overfull warnings, bib errors, timeout, OOM).

### 5.3 Acceptance criteria
- Sandbox test suite (runs in CI against the real worker image): `\input{/etc/passwd}` fails with a permission error and no content leak; `\write18{id}` is inert; `\def\x{\x}\x` is killed at timeout with a clean `failed(timeout)` status; 1GB output PDF is truncated to failure; network egress from the sandbox is impossible (asserted with a canary domain).
- A project with `\includegraphics` of an uploaded asset and a `.bib` bibliography compiles correctly end-to-end (e2e).
- 20 simultaneous compile requests across projects: queue drains, no API latency impact (load test).

---

## 6. Product Surface (apps/web + api)

### 6.1 Editor
- Monaco LaTeX language contribution (`packages/latex-language`): tokenizer for commands/environments/math/comments, bracket pairs, folding on `\begin/\end`, completion provider fed by a static command DB + labels/citations scanned from project `.bib`/`\label` (worker-parsed, debounced).
- Compile errors → Monaco markers via the §5 structured errors; a problems panel lists them; clicking jumps to file+line.
- Presence: y-monaco remote cursors with user color/name from awareness (userId → profile fetched via api, cached).
- Status pill driven by the §3.3 state machine; explicit read-only banner for viewers.

### 6.2 Preview parser (`components/Parser/`)
Keep as instant preview (it's a differentiator), but harden as a security surface:
- All rendering goes through React elements only — audit and CI-ban `dangerouslySetInnerHTML` in the parser tree (eslint rule).
- KaTeX with `trust: false`, `maxExpand: 1000`, error boundary per math block (blast radius = one formula).
- URL sanitization for `\href`/`\url`: allow `https?:` and `mailto:` only.
- Lexer/parser: explicit recursion depth cap (256) and input cap (2MB) returning a typed "document too complex for live preview — use PDF compile" node; property-based fuzz test (fast-check) asserting the parser never throws on arbitrary input.
- Preview runs in a web worker; main thread receives a serialized node tree (keeps 100k-line docs from freezing the UI).

### 6.3 Workspaces & invitations
- Enforce role matrix (§2) in the UI (hide, and handle 403 anyway).
- Invitations: enforce `expires_at` (exists in migration 0002), single-use tokens hashed at rest, resend with dedupe, accept path normalizes email casing, accepting while already a member is a no-op success. Email sending moves to an asynq task with retry (currently inline SMTP in request path — `emailServices/email.go`).
- Ownership transfer flow (required by §1.2 account deletion).

### 6.4 Version history
- `doc_versions(id, doc_name, name, state BYTEA, created_by, created_at)`: automatic version every 30 min of active editing (compaction job cut-points) + manual "name this version". Restore = apply-as-new-update (never overwrite), producing a forward change — offline peers converge normally.
- Retention: named versions are kept indefinitely; automatic versions pruned to the most recent 50 per doc and nothing older than 90 days (nightly job). Unbounded 30-minute snapshots of every active doc would dominate storage within months.

### 6.5 Offline application shell
- Next.js PWA (serwist): precache app shell + editor chunks + KaTeX fonts; runtime cache for project metadata (stale-while-revalidate). Full flow — open app offline → open previously-opened project → edit → later sync — is an e2e test on every release.

### 6.6 Admin (internal)
- Separate `admin` role on `users` (column, default false; set via ops runbook, not UI). `/admin` routes (api + web): user search/disable, workspace inspection (metadata only, never document content), compile queue dashboard, feature flags (Redis-backed).

### 6.7 Project export
- `GET /api/projects/:id/export` (viewer role) streams a zip: editable files materialized from sync, assets from S3, laid out per the file tree. Serves both the "download my project" feature and the §12 data-portability requirement. Filenames are safe cross-platform by construction (§4.2 hygiene rules).

---

## 7. Rate Limiting & Abuse (api)

Redis sliding-window limiter middleware (`internal/httpmw/ratelimit.go`), keyed per-route:

| Surface | Limit |
|---|---|
| `POST /auth/login` | 5/min/IP + 10/hour/account; 10 failures → 15-min account lock + email notice |
| `POST /auth/register` | 3/hour/IP; email verification required before workspace creation |
| `POST /auth/refresh` | 30/hour/session |
| `POST /projects/:id/compile` | 1 concurrent + 30/hour/user |
| Upload initiate | 60/hour/user, quota checks in-line |
| `GET /users/search` | 30/min/user, min query length 3 |
| Invitations | 20/day/workspace |
| WS tickets | 30/min/user |
| PAT-authenticated requests (§13) | 120/min/token |
| Compile via PAT | 1 concurrent + 10/hour/token (per-token budget, owner-adjustable downward) |
| WS tickets via PAT | 10/min/token |

429 responses carry `Retry-After`. Limits are config, not constants.

---

## 8. API Service Hygiene (apps/api refactor)

- **Config:** single `internal/config` struct, loaded once in `main`, `envconfig`-style with required/validated fields; process exits with a complete list of missing vars. `godotenv` only under `ENV=dev`. Kill the `init()` in `authServices/jwt.go` (config via dependency injection, which also unblocks testing).
- **Errors:** one error envelope `{error: {code, message}}` with a typed error → HTTP mapping in middleware. Raw `err.Error()` never reaches a response (currently done in upload/snapshot handlers).
- **CSRF:** cookie auth requires an explicit cross-site write defense — `SameSite=Lax` is defense-in-depth, not the control. Middleware (`internal/httpmw/csrf.go`) rejects POST/PUT/PATCH/DELETE unless `Sec-Fetch-Site` is `same-origin`/`none`, falling back to an `Origin` header match against the canonical host for older clients. 403 with a distinct error code; on by default for every state-changing route.
- **Gin:** `gin.New()` + explicit recovery/logging middleware, `ReleaseMode`, `SetTrustedProxies` to the edge proxy CIDR only, request-size limit 1MB default (uploads bypass via presigned S3), timeouts on `http.Server` (read 10s / write 30s / idle 120s), graceful shutdown on SIGTERM draining in-flight requests (replaces `log.Fatal(r.Run())` in `cmd/server/main.go`).
- **DB:** pgxpool with explicit pool sizing from config; every query behind a context deadline (default 5s); `sqlc` adopted for the query layer (replaces hand-rolled string structs in `internal/queries/…`, gives compile-time column safety).
- **Delete:** `/hello-world`; static `/health` (replace with `/healthz` liveness + `/readyz` checking Postgres, Redis, S3 HEAD); `errorHandler` package (folded into the error envelope); all `fmt.Printf`/content-logging.
- **OpenAPI:** the swagger annotations stay, but CI generates the spec and the TS client in `packages/shared` from it; frontend hand-written endpoint files in `lib/api/endpoints/` are replaced by the generated client.

---

## 9. Observability

- **Logging:** zerolog (api, worker) / pino (sync), JSON, `request_id` propagated from Caddy (`X-Request-Id`), fields for `user_id`, `project_id`, `job_id`. Content fields (document text, filenames beyond basename, emails in bulk) are structurally excluded.
- **Metrics:** Prometheus endpoints on all services. Golden signals plus: sync doc count/connections/awareness fanout latency; queue depth & compile duration histograms; token-refresh reuse-detection counter (security signal); Postgres pool saturation.
- **Tracing:** OpenTelemetry SDK in all four services, traces through api → queue → worker via task metadata; OTLP to the collector (Grafana stack or Honeycomb — infra decision, single line of config either way).
- **Errors:** Sentry in web (source maps uploaded in CI), api, sync, worker.
- **Alerts (minimum set):** readiness failing >2m; compile p95 >90s or failure rate >20%; queue depth >100 for >5m; refresh-reuse events >0; Postgres storage >80%; certificate expiry.

---

## 10. CI/CD & Environments

**CI (GitHub Actions, all required for merge):**
1. `golangci-lint`, `go vet`, `go test -race` (api, worker) — includes the §2 authz matrix and §5 log-parser corpus.
2. `tsc --noEmit`, eslint (with the §6.2 `dangerouslySetInnerHTML` ban), vitest (web, sync; parser fuzz included).
3. Migrations applied to a clean Postgres, then `sqlc` diff check (schema and queries can't drift).
4. Integration tests: testcontainers (Postgres, Redis, MinIO) for api; sync persistence round-trip.
5. Sandbox suite against the built worker image (§5.3).
6. Playwright e2e against a compose-built full stack: auth, collab (two contexts), offline/reconnect, compile-with-assets, PWA offline shell.
7. `govulncheck`, `npm audit --audit-level=high`, image scan (trivy); Docker builds pushed on main.

**Environments:** `dev` (docker-compose: postgres, redis, minio, caddy, all four apps, hot-reload), `staging` (auto-deploy on main, seeded fixtures, e2e smoke post-deploy), `prod` (manual promotion of the staging-verified image set; migrations run as a pre-deploy job, expand-migrate-contract discipline for breaking changes).

**Infra as code:** `infra/` Terraform — DNS, certs (Caddy handles issuance), Postgres (Neon) config, Redis, S3 buckets + lifecycle rules (builds 30d, job bundles 7d), secret store (platform-native), deploy definitions. Secrets never in repo or images.

**Backups/DR:** Neon PITR verified by a quarterly restore drill; S3 versioning on the assets bucket; runbook per alert in `docs/runbooks/`.

---

## 11. Execution Order & Ownership

Workstreams are sequenced so nothing ships publicly before its security dependency:

1. **W1 – Foundation** (repo restructure to monorepo, compose dev env, config layer, CI skeleton, sqlc adoption, delete dead code/routes). Everything else depends on this.
2. **W2 – Identity & AuthZ** (§1, §2, §7). Blocks all public exposure.
3. **W3 – Sync service** (§3) and **W4 – Multi-file** (§4) — W3 and W4 land together behind the new editor route; the legacy snapshot path is removed in the same release with the data migration.
4. **W5 – Compile pipeline** (§5) — can develop in parallel with W3/W4 (input staging is its only coupling).
5. **W6 – Product surface** (§6) — iterative after W3–W5.
6. **W6.5 – Agent access** (§13): PATs, `packages/mcp`, agent rate limits, presence attribution. Depends on W3 (sync) + W5 (structured errors); **fast-follow, not launch-gated** — shipping it before the core is solid would be marketing before product.
7. **W7 – Observability/CD hardening** (§9, §10) — starts in W1, finishes before launch.

Launch gate checklist: authz matrix green · sandbox suite green · offline e2e green · load test (100 rooms × 5 clients, 20 concurrent compiles) green · alerts firing in staging chaos drill · restore drill performed · pen-test pass on auth + sandbox · DMARC enforced · ToS/privacy live · export + account-deletion path verified (§12).

---

## 12. Compliance & Launch Surface

Production is not only code; these ship inside W7 and gate launch:

- **Email deliverability:** dedicated sending subdomain (`mail.synctex.org`) with SPF, DKIM, and DMARC (`p=quarantine`, moving to `p=reject` after burn-in); transactional provider (Postmark/SES) replaces raw SMTP in `emailServices`; bounce/complaint webhooks mark addresses undeliverable and suppress further sends. Invitations that land in spam are a dead product.
- **Legal minimum:** Terms of Service and privacy policy pages live before public signup; cookies are first-party essential only (documented; no consent banner required); `/.well-known/security.txt` with a monitored security contact.
- **Data portability & erasure:** account export (profile + workspace membership JSON) plus per-project zip export (§6.7); account deletion completes within 30 days including S3 objects, doc rows, and version history (extends the §1.2 and §4.2 purge jobs); deletion is verified by an automated audit query, not assumed.
- **Abuse handling:** report/DMCA contact path documented before any public-sharing feature ships.

---

## 13. MCP & Agent Access (packages/mcp + api)

### 13.1 Why this exists (strategy in one paragraph)
Our CRDT architecture makes an AI agent a first-class collaborator: its edits are ordinary Yjs updates that merge conflict-free beside live human typing, with presence, while Overleaf's OT design structurally can't offer more than a scripted browser. Combined with structured compile errors (§5 — an agent can run an edit→compile→read-errors→fix loop autonomously) and self-hosting ("your AI, your server, your thesis"), MCP turns the same architectural bet that gives us offline into an agent-collaboration story. Deliberate constraint: **we ship the socket, not the electricity** — no in-product assistant, no inference bill, any MCP-capable client works. MCP itself is table stakes within a year; the moat is the combination.

### 13.2 Personal Access Tokens (api)
This pulls forward the PAT decision deferred in §1.2.

```sql
CREATE TABLE personal_access_tokens (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,                    -- user-facing label ("Claude on laptop")
  token_hash   BYTEA NOT NULL UNIQUE,            -- SHA-256; plaintext shown exactly once at creation
  scope_kind   TEXT NOT NULL CHECK (scope_kind IN ('workspace','project')),
  scope_id     UUID NOT NULL,
  max_role     role_enum NOT NULL,               -- ceiling, not a grant
  compile_per_hour INT NOT NULL DEFAULT 10,
  last_used_at TIMESTAMPTZ,
  expires_at   TIMESTAMPTZ NOT NULL DEFAULT now() + interval '90 days',
  revoked_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON personal_access_tokens(user_id) WHERE revoked_at IS NULL;
```

- Format `st_pat_<256-bit random, base62>`; the prefix routes it to PAT middleware (`internal/httpmw/pat.go`), fully separate from cookie auth. CSRF middleware (§8) exempts PAT requests — header-borne bearer tokens are not CSRF-able.
- **Effective role = min(max_role, the user's current membership role), resolved per request.** A PAT never outlives or exceeds its owner's access: membership revoked → PAT dead for that scope automatically; owner demoted to viewer → PAT is viewer. No separate grant system to audit.
- Management UI in account settings: list (name, scope, last used), create (plaintext shown once), revoke. Creation requires a verified email. PATs cannot mint other PATs or touch `/auth/*` or admin routes (allowlist of route groups in the middleware).
- WS access: `POST /api/ws-ticket` accepts PAT auth; the issued ticket context carries `agent: true` and the effective role. Everything downstream (§1.3, §3.2) works unchanged.

### 13.3 The MCP server (`packages/mcp`)
- Published as `@synctex/mcp`, run via `npx @synctex/mcp` (stdio transport — works with Claude Code, Claude Desktop, and any MCP client). Config: `SYNCTEX_URL` + `SYNCTEX_TOKEN` (PAT). **The same package targets our hosted instance or any self-hosted one** — this is the self-host synergy, and every AI-assisted user is an on-ramp we don't pay for.
- Internals: the generated OpenAPI client (§8) for tree/compile/export REST, plus a headless `@hocuspocus/provider` for document access — reads and edits go through the real sync path as CRDT updates with presence, never a bypass API.
- Tool surface (v1, deliberately small):
  - `list_projects()`, `get_file_tree(projectId)`
  - `read_file(projectId, fileId)` — materialized text
  - `edit_file(projectId, fileId, edits[])` — ranged edits applied to the Y.Text (position-anchored, so concurrent human typing doesn't invalidate them)
  - `create_file(projectId, parentId, name, kind)` (API-authoritative per §4.2)
  - `compile(projectId)` → `jobId`; `get_compile_result(jobId)` → status + **structured errors** + PDF URL
  - `export_project(projectId)` → zip URL
- Explicit non-tools: no member management, no deletion of files or projects, no PAT/account operations. Agents write documents; humans govern projects.

### 13.4 Attribution (hard rule, server-enforced)
- Connections from PAT-issued tickets are stamped `agent: true` **by sync**, not by client self-declaration — an agent cannot present as its human. Presence renders as "⚡ <client name> via <username>" with a distinct cursor style.
- `doc_versions` gains `created_via ENUM('user','agent')`; version history and the §6.4 UI show it. In academic settings, "which paragraphs did the AI write" must be answerable — this is a trust feature, not compliance theater.
- Agent compile jobs carry the token id in job metadata → per-token budget enforcement (§7) and per-token observability (§9 gets an `agent_requests` metric dimension).

### 13.5 Acceptance criteria
- E2E: an MCP client edits a file while a human types in the same paragraph in a browser — both converge, agent presence visibly labeled; revoking the PAT mid-session kills the agent's socket within 1s and subsequent tool calls 401.
- A PAT scoped `viewer` cannot edit through any path (REST, WS, MCP tools) — added to the §2 authz matrix test.
- Agent compile loop: intentionally broken doc → `compile` → structured errors → fix → green, entirely through MCP tools, within the per-token budget.
- Membership removal propagates: user removed from workspace → their PATs return 404/403 for that scope with no cache window beyond one request.
