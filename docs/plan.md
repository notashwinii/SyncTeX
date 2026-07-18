# SyncTeX — Production Readiness Plan

Goal: take the current prototype (Next.js + Yjs frontend, Go/Gin backend, Postgres, S3, pdflatex) to a production-grade collaborative LaTeX editor. This plan is grounded in a review of the actual code; file references point at the specific problems.

Priority legend: **P0** = security hole or data-loss bug, blocks any public deployment. **P1** = required for "full-fledged product". **P2** = scale/polish.

---

## 1. Current State Assessment

What works: auth (JWT + bcrypt), workspace/project/invitation CRUD with membership checks, Monaco + Yjs + y-indexeddb offline editing, a custom LaTeX→HTML preview parser with KaTeX, server-side `pdflatex` via `gotex`, S3 uploads.

What is fundamentally not production-ready:

- **Zero tests** anywhere (backend or frontend).
- The WebSocket layer is a dumb byte relay that does not implement the y-websocket protocol and caps messages at **512 bytes** — real-world sync breaks immediately.
- Several authenticated endpoints have **no project-level authorization**.
- LaTeX compilation runs **unsandboxed on the host**.
- Debug leftovers in code paths (`fmt.Printf("cookies\n")` in `backend/internal/middleware/auth.go:21`, hardcoded `\ima` "syntax checks" in `backend/internal/services/downloadServices/download.go:27-33`, `/hello-world` route).
- The runtime Docker image (`backend/Dockerfile`, alpine) **does not contain TeX Live**, so PDF compilation cannot work in the containerized deployment at all.
- `project_files` table is used by `backend/internal/queries/projectQueries/files.go` but **has no migration** — fresh DBs break on upload.

---

## 2. P0 — Security

### 2.1 Authorization gaps (broken access control)
Membership is checked in `projectHandlers` and `workspaceHandlers`, but **not** in:

- `GET/PUT /projects/:id/snapshot` (`snapshotHandlers/snapshot.go`) — any logged-in user can read or overwrite any project's document state by guessing/knowing a UUID.
- `POST /projects/:id/download` (`downloadHandlers/download.go`) — no access check at all.
- `POST /projects/:id/storage/upload`, `GET /projects/:id/tree`, `GET /signed-url` (`storageHandlers/*`) — no membership check.
- `GET /ws/:projectID` (`websocket/ws.go:47`) — only checks the project **exists**, not that the user is a member. Any authenticated user can join any project's live editing room and receive/inject edits.

**Fix:** one reusable `RequireProjectAccess(pool)` middleware (wrapping `projectQueries.Q.CheckProjectAccess`) applied to every `/projects/:id/*` route and the WS route. Add role-based variants (viewer vs editor vs owner) once roles are enforced (see 5.3).

### 2.2 LaTeX compilation sandbox (highest-severity issue)
`gotex.Render` shells out to system `pdflatex` with user-controlled content (`downloadServices/download.go`). TeX is a programming language; unsandboxed compilation allows:

- Reading server files: `\input{/etc/passwd}`, `\openin`.
- Writing files outside the job dir (`\openout`, `openout_any`).
- `\write18` shell execution if shell-escape is ever enabled by a distro default.
- CPU/memory DoS: `\def\x{\x}\x`, `\loop`, huge box allocations — there is **no timeout and no resource limit**.

**Fix:** run every compile in an isolated, disposable environment:
- Dedicated compile container (TeX Live image) with: no network, read-only rootfs, tmpfs job dir, non-root user, `--no-shell-escape`, `openin_any=p openout_any=p`, CPU/memory/pids cgroup limits, wall-clock timeout (e.g. 60s), output size cap.
- Preferably behind a job queue (see 6.2) so compiles can't exhaust the API server. nsjail/firejail/gVisor or a "compile worker" container pool are all acceptable; the API server itself must never exec `pdflatex` directly.
- Delete the hardcoded `\ima` / `\section Introduction` string checks — they are debugging leftovers, not validation.

### 2.3 Token & session handling
- **Refresh token revocation:** `jwt.go` generates a `TokenID` but never stores it. Logout only clears cookies — a stolen refresh token is valid for 30 days with no way to revoke. Store refresh token IDs (DB or Redis) with rotation-on-use and replay detection; invalidate the family on password change/logout.
- **Token in query string:** `middleware/auth.go:29` accepts `?token=` — tokens end up in access logs, proxies, browser history. Remove it; for WS auth use the cookie (same-site deploy) or a short-lived one-time ticket endpoint (`POST /ws-ticket` → 30s single-use token passed as WS subprotocol or query).
- `rand.Read` error ignored in `generateTokenID()` (`jwt.go:41`).
- Cookies: `SetCookie` uses default SameSite and empty domain. Set `SameSite=Lax` (or `Strict` + explicit CORS strategy), `Secure`, and decide the deployment topology (same-site via reverse proxy is strongly recommended — it makes cookie auth for WS work and removes the whole cross-origin cookie mess).
- No password reset, no email verification, no account lockout — all required before real users (see 5.3).

### 2.4 CORS & WebSocket origin
- `router.go:54` allows **any** `http://localhost:*` origin even in production builds. Gate this behind an `ENV=dev` flag.
- `websocket/ws.go:18` `CheckOrigin: return true` — combined with cookie auth this is a textbook Cross-Site WebSocket Hijacking vector. Validate `Origin` against the allowed list.

### 2.5 Uploads
`storageHandlers/upload.go` has no limits or validation:
- No max file size (Gin default is 32MB memory buffer, but nothing app-level) → set per-file and per-project quotas.
- No filename sanitization (path traversal into object keys, `../`, control chars, 10KB names).
- No content-type validation (MIME sniff, allowlist: images, .tex, .bib, .cls, .sty; reject executables).
- Raw `err.Error()` returned to clients (internal detail leakage) — here and in several other handlers.
- No cleanup: deleting a project cascades DB rows but **orphans S3 objects**. Add deletion of object keys (background job).

### 2.6 Rate limiting & abuse
None exists. Add (middleware + Redis):
- Login/register/refresh: strict per-IP + per-account limits (brute-force).
- Compile endpoint: per-user concurrency 1 + N/hour budget (it's the most expensive op).
- Upload, invitation sending (email spam), user search (enumeration).
- `GET /users/email/:email` is a user-enumeration oracle — reconsider exposing it, or return uniform responses.

### 2.7 Misc hardening
- `gin.Default()` in release: set `gin.ReleaseMode`, configure trusted proxies, add security headers (CSP for frontend, `X-Content-Type-Options`, etc.).
- `Content-Disposition` filename built with raw `projectID` (`downloadHandlers/download.go:44-47`) — sanitize/quote (header injection).
- Remove `/hello-world`; make `/health` actually check DB + S3 (currently returns static JSON).
- Secrets: `.env.sample` documents only `DB_URI`/`JWT_KEY` but code requires `REFRESH_KEY`, `B2_BUCKET`, S3 creds, SMTP, `FRONTEND_ORIGIN`, `PORT`. Centralize config loading with validation at boot; use a secrets manager in prod; document everything.

---

## 3. P0 — Sync Correctness (the core feature is currently broken)

### 3.1 The WS relay does not speak y-websocket
`websocket/hub.go` + `client.go` blindly re-broadcast binary frames. The y-websocket client protocol expects the **server** to be a sync authority (respond to SyncStep1 with SyncStep2, manage awareness, replay state to late joiners). Consequences today:

- A client joining an empty room gets no document state from the server; it only converges if another live client happens to answer its broadcast SyncStep1.
- **`maxMessageSize = 512` bytes** (`client.go:22`): any Yjs update larger than 512B (i.e. almost any real document sync, paste, or initial state transfer) kills the connection. This alone makes collaboration non-functional beyond toy docs.
- Awareness (cursors/presence) messages are relayed to everyone but never tracked or cleaned up on disconnect → ghost cursors.
- No server-side persistence of updates: if all clients disconnect between snapshots, edits exist only in browsers' IndexedDB.

**Fix (choose one, in order of preference):**
1. Implement a proper Yjs-aware backend in Go using a y-crdt binding: keep a server-side `Y.Doc` per room, implement sync + awareness protocol, persist updates incrementally (append update log, compact into snapshot), serve state to late joiners.
2. Or run the battle-tested Node `y-websocket` server (already in `package.json` as `@y/websocket-server`) as a sidecar service with a persistence adapter to Postgres/S3, and keep Go for REST only. Less elegant, much faster to correctness.

Either way: raise message limits (e.g. 10MB), add per-room auth on join (2.1), and kick connections when a user is removed from the workspace or the project is deleted.

### 3.2 Client-side WS bugs (`frontend/components/Editor/BaseEditor.tsx`)
- **URL construction is broken:** `serverUrl = ${wsUrl}/api/ws?token=...` and then `WebsocketProvider` appends `/<roomname>` — producing `ws://host/api/ws?token=abc/<projectId>`, which doesn't match the `/api/ws/:projectID` route. Also the token is read from `localStorage.getItem('token')`, which is **never written** (auth uses httpOnly cookies). WS auth works only by accident in same-origin dev, if at all.
- **Default-content race:** `setTimeout(1000)` then "insert if empty" — two clients joining simultaneously both insert the template (duplicated preamble); an offline client that hasn't synced also inserts over an existing doc. Initialize default content **server-side at project creation** (write an initial snapshot), never from the client on a timer.
- **No cleanup on unmount:** `Y.Doc`, `WebsocketProvider`, `IndexeddbPersistence`, and `MonacoBinding` are never destroyed → leaked sockets, double bindings under React StrictMode/dev, duplicated updates.
- Hardcoded text type name `"monacotest"` — define a stable schema (`doc.getText('content')` per file; see 5.1).
- Two editor pages exist (`app/editor/` and `app/projects/[projectId]/editor/`) — consolidate on the project-scoped one and delete the other.

### 3.3 Snapshots
- `snapshotQueries.UpsertSnapshot` is a plain **INSERT** — every save adds a row forever ("latest-only" comment is false). Add `UNIQUE(project_id)` + `ON CONFLICT DO UPDATE`, or keep history intentionally with a retention/compaction policy (N most recent + daily). Add index `(project_id, created_at DESC)`.
- No size cap on `state` (a client can PUT arbitrarily large base64). Enforce a limit (e.g. 20MB) and validate it decodes as a Yjs update before storing.
- `GetLatestSnapshot` returns `204` on **any** scan error, masking real DB failures — distinguish `ErrNoRows` from errors.
- Snapshots must be stored/applied as Yjs updates (merge via `Y.applyUpdate`), never as a text overwrite, or offline clients' edits get clobbered on restore.

### 3.4 Hub robustness
- `hub.go` broadcast path deletes clients and `close(client.Send)` inline; combined with the unregister path this is fragile (double-close risk as code evolves). Route all removals through one path; mark closed state on the client.
- `writePump` exit on write error doesn't trigger unregister (relies on readPump noticing). Tie both pumps' lifecycle together (context/cancel).
- Single global in-process hub: fine for one instance, but blocks horizontal scaling — see 7.2.

### 3.5 PDF generation compiles the wrong thing
`POST /projects/:id/download` takes `content` from the **request body**, not from the project's authoritative state — so the server is an open compile service (any content, any project id), and compiled output can diverge from the shared doc. Compile from the server-side doc/snapshot plus the project's uploaded assets (images from S3 staged into the job dir) — this is also what makes `\includegraphics` work in exported PDFs.

---

## 4. P0/P1 — Data Model & Migrations

- **Add the missing `project_files` migration** (used by `files.go`, absent from `migrations/`). From now on, CI must run migrations against a clean DB to catch this class of bug.
- `sessions`/`collaborations` tables are written but never enforced or cleaned — either wire them into presence/analytics or drop them (dead weight).
- Dangerous cascade: `workspaces.owner_id → users(id) ON DELETE CASCADE` means **deleting a user account deletes entire shared workspaces and all members' projects**. Change to ownership transfer or soft-delete users; at minimum require workspaces to be empty/transferred before account deletion.
- Add `updated_at` triggers, `deleted_at` soft deletes where recovery matters (projects), and FK indexes review.
- Store per-file documents when multi-file lands (5.1): `documents(id, project_id, path, ydoc_state, updated_at)`.

---

## 5. P1 — Product Completeness

### 5.1 Multi-file projects (the biggest functional gap)
Today one implicit text ("monacotest") per project; the file tree exists only for uploaded assets. Needed:
- One Yjs doc (or subdocument) per `.tex`/`.bib` file; file create/rename/move/delete propagated in real time (file tree itself as a Yjs map).
- Compile entry-point selection (`main.tex`), `\input`/`\include` resolution from project files.
- Assets available to both the HTML preview (signed URLs) and PDF compile (staged into job dir).
- Per-file IndexedDB persistence keyed by project+file (current key is just `projectId`).

### 5.2 Compile pipeline
- Job queue with worker pool (see 2.2 sandbox); per-user concurrency limits; job status endpoint or WS notifications.
- Parse the pdflatex log into structured errors/warnings with file + line mapping; surface them in the editor gutter (squiggles) instead of a raw failure string.
- Support bibtex/biber and multiple runs (gotex's `Runs: 2` is not enough for bibliographies); cache aux files per project for incremental speed.
- Store compiled PDFs in S3 with retention; serve via signed URL instead of streaming through the API.

### 5.3 Accounts & roles
- Email verification, password reset (token email flow), password change with session invalidation, account deletion (with 4's ownership rules).
- Enforce workspace roles end-to-end: `viewer` (read-only doc + WS read-only mode), `editor`, `admin/owner` (member management, project deletion). Roles exist in the DB but are never checked for authorization strength beyond membership.
- Invitation lifecycle: expiry (column exists in migration 0002 — enforce it), resend, dedupe, accepting when already a member, invited-email ≠ registered-email casing (normalize emails to lowercase at registration and lookup).
- Optional but high-value: OAuth (Google/GitHub) for the academic audience.

### 5.4 Editor & preview UX
- Monaco LaTeX language definition: syntax highlighting, snippets, command/environment autocomplete, brace matching (currently plain text).
- Presence UI: named cursors/selections from awareness (y-monaco supports this; needs server awareness handling from 3.1).
- Save/sync status indicator (offline / syncing / saved), conflict-free reassurance messaging.
- Parser hardening (`components/Parser/`):
  - **XSS audit**: fuzz LaTeX→HTML output; ensure no raw HTML passthrough, sanitize `\href`/`\url` schemes (block `javascript:`), KaTeX `trust: false`.
  - Recursion depth limit in the recursive-descent parser (deeply nested environments → stack overflow) and input size guard; verify no catastrophic-backtracking regexes in the lexer.
  - Graceful degradation for unsupported commands (render as literal + warning) instead of parse failure.
- True offline app shell: current "offline-first" only works in an already-open tab. Add a PWA service worker so the editor loads offline; handle IndexedDB-unavailable environments (Firefox private browsing) with an in-memory fallback + warning banner.

### 5.5 Version history
- Periodic named snapshots (leveraging the snapshot history if kept per 3.3), diff view, restore-to-version (as a new Yjs update, not an overwrite).

### 5.6 Admin
The report promises an Admin actor; nothing exists. Minimum: user list/disable, workspace stats, compile-queue dashboard, feature flags.

### 5.7 Agent access via MCP (differentiator, fast-follow)
Expose the editing/compile surface to AI agents through an MCP server (`npx @synctex/mcp`) backed by scoped personal access tokens. The CRDT backend makes an agent an ordinary collaborator (conflict-free edits beside live human typing, labeled presence), and the structured compile errors give agents an autonomous fix-the-build loop. BYO-agent — no in-product assistant, no inference costs. Works identically against hosted and self-hosted instances. Full spec: `implementation.md` §13.

---

## 6. P1 — Frontend Engineering Hygiene

- **Prune dependencies:** `express`, `ws`, `y-webrtc`, `monaco` (the odd `1.201704190613.0` package), `@y/websocket-server` are unused or dev-only leftovers in the app bundle context. Also `jszip` — verify usage.
- Auth flow: `middleware.ts` trusts cookie **presence** only (fine as UX gating, but ensure every page also handles 401s); the axios refresh interceptor should cap retries and handle two-tab refresh races (server-side rotation makes this observable).
- Error/loading states for every query and mutation (React Query is present — use error boundaries + toasts consistently); remove `console.log`s.
- Env validation at build/boot (`NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_WS_URL`) — fail loudly instead of silently defaulting to localhost in a prod build.
- Accessibility pass (keyboard nav in file tree/modals, focus traps, contrast) and mobile layout at least for reading.

---

## 7. P1/P2 — Infrastructure, Ops, Scale

### 7.1 Deployment
- **Fix the backend Dockerfile**: runtime stage must be able to reach a compile worker (preferred) or include TeX Live; add non-root user, healthcheck, `ca-certificates`.
- docker-compose for local dev (Postgres, MinIO, backend, frontend, compile worker) so onboarding isn't "install five things".
- Graceful shutdown: replace `log.Fatal(r.Run(...))` with `http.Server` + signal handling; drain WS connections; close pool.
- Reverse proxy (same-site domain for app + API + WS) — simplifies cookies, CORS, and WS auth in one move.

### 7.2 Horizontal scaling
- WS rooms are in-process; two API replicas split rooms. Add Redis pub/sub (or NATS) fan-out per project room, or sticky sessions as an interim step. Document-authority state (3.1) must live behind a per-room single writer (route rooms to owners consistently, or use Redis-backed doc storage).
- DB pool tuning, read paths cacheable; snapshot/state blobs to S3 above a size threshold instead of Postgres BYTEA.

### 7.3 Observability
- Structured logging (zerolog/zap) with request IDs; **never log tokens or document content** (current code logs the first 200 chars of every compiled document, `download.go:14`).
- Prometheus metrics: WS connections/rooms, broadcast fanout latency, compile queue depth/duration/failure rate, HTTP latencies.
- Sentry (frontend + backend), uptime checks on real dependency-aware `/health`, alerting.

### 7.4 CI/CD
- CI: `golangci-lint`, `go vet`, `go test -race`, migrations against clean Postgres, `eslint`, `tsc --noEmit`, frontend tests, `npm audit`/`govulncheck`, Docker builds.
- CD: staging env, migration gating, tagged releases, rollback story. Repo currently isn't even a git repo at the root — set up the monorepo (or two repos) with protected main.

---

## 8. Testing Strategy (from zero)

| Layer | What to test first |
|---|---|
| Backend unit | auth service (token gen/validate/rotation), password validation, authz middleware, log parser |
| Backend integration (testcontainers: Postgres + MinIO) | every handler's authz matrix (member/non-member/no-auth), snapshot upsert semantics, invitation lifecycle, upload validation |
| WS protocol | late-joiner receives full state; 1MB update survives; non-member rejected; removal mid-session kicks; server restart → clients resync |
| Compile sandbox | `\input{/etc/passwd}` blocked, infinite loop times out, shell-escape blocked, bibliography compiles, output cap enforced |
| Parser unit | command/env coverage table, malformed input never throws, XSS corpus, deep nesting bounded |
| E2E (Playwright) | signup→workspace→project→edit→compile→download; **two-browser concurrent editing**; offline edit → reconnect → merge (the headline feature must have a regression test) |
| Load (k6) | 100 rooms × 5 clients typing; compile queue under burst; login brute-force limiter verified |

---

## 9. Edge Case Catalog

Explicitly enumerate and handle (each should map to a test or a documented decision):

**Sync & offline**
- Two clients edit the same sentence offline for days, both reconnect — merge must converge (Yjs handles it; snapshot restore path must not clobber it).
- Same user, same project, two tabs / two devices simultaneously.
- Client with weeks-old IndexedDB state rejoins after server snapshot moved far ahead (large state-vector diff; message size limits).
- IndexedDB unavailable (private browsing), quota exceeded, or user clears site data mid-session.
- Safari's 7-day ITP storage eviction silently deletes "offline" work — warn users / re-sync early.
- User removed from workspace (or project deleted) while offline with pending edits — define behavior: edits rejected on reconnect with export-your-copy UX.
- Server restarts mid-session; reconnect storm afterwards (exponential backoff + jitter in provider config).
- Flapping network / captive portal: rapid connect/disconnect cycles must not duplicate content (see default-content race, 3.2) or leak connections.
- Echo/loop protection if a relay ever reflects a message to its sender.
- Tombstone/history growth in long-lived docs → periodic doc compaction policy.

**Compilation**
- Infinite macro loops, exponential macro expansion ("billion laughs"), gigantic generated PDFs, output floods to the log.
- Missing packages/classes; non-UTF8 bytes in source; BOM; CRLF.
- Compile triggered while doc is mid-edit (stale content) — compile from a consistent snapshot, show which version compiled.
- Two concurrent compile requests for the same project (dedupe/queue), user spamming recompile.
- Empty document, whitespace-only, missing `\end{document}` (currently a string check — let pdflatex report it properly).

**Files & storage**
- Path traversal names (`../../x`), reserved names, emoji/RTL/control characters, 300-char filenames, duplicate names in one folder.
- MIME spoofing (executable renamed `.png`); zip-bomb-ish huge images; zero-byte files.
- Upload interrupted mid-stream; S3 outage (retry/backoff, user-visible error); orphaned S3 objects on project delete (2.5).
- Project/workspace deleted while a signed URL is still live.

**Auth & accounts**
- Refresh token replay after rotation (must invalidate family); logout on one device vs all devices.
- Access token expiring while a WS connection stays open for hours — periodic revalidation or bounded WS session lifetime.
- Password change/reset must kill other sessions.
- Email case/unicode normalization (`Foo@X.com` == `foo@x.com`), username uniqueness vs display name, 64-char usernames in UI layouts.
- Clock skew between servers and JWT `exp` validation.

**Workspaces & collaboration**
- Owner deletes account → shared workspaces must not vanish (see cascade bug, §4).
- Invitation accepted twice / after expiry / by a user who registered with a different email casing; invitee already a member.
- Concurrent `AddMember` for the same user (unique constraint exists — handle the 23505 gracefully).
- Role changes taking effect on live WS sessions (editor demoted to viewer mid-edit).
- Last admin/owner leaving a workspace.

**Editor & preview**
- 5MB paste into Monaco; 100k-line documents (virtualization, parser debounce/worker).
- Malformed KaTeX input (ErrorBoundary exists — keep it, add per-block isolation so one bad formula doesn't blank the preview).
- LaTeX that renders as HTML: `\href{javascript:alert(1)}`, `<script>` in text, image URLs — sanitize (5.4).
- Deeply nested `\begin{itemize}` × 10k (parser recursion bound).

**Browser/platform**
- WS blocked by corporate proxies (provide long-poll fallback or at least a clear error), cookies blocked, third-party storage partitioning if API is cross-site (another argument for same-site deployment, 7.1).
- Low-memory mobile devices with big docs; background-tab throttling of timers (don't rely on `setTimeout` for correctness — see 3.2).

---

## 10. Suggested Phasing

**Phase 0 — Stabilize the base (1–2 weeks)**
Git repo + CI skeleton, docker-compose dev env, missing `project_files` migration, remove debug code/routes, config validation, test harness with the first authz + snapshot tests.

**Phase 1 — Security (2–3 weeks)**
Project-access middleware everywhere (incl. WS), sandboxed compile worker, refresh-token store + rotation, cookie/CORS/WS-origin fixes, upload validation + limits, rate limiting, secrets management.

**Phase 2 — Sync correctness (2–4 weeks)**
Yjs-aware server (or `@y/websocket-server` sidecar) with persistence + awareness, remove 512B cap, fix client WS URL/auth, server-side default content, provider cleanup on unmount, snapshot upsert + compaction, WS kick on membership change. E2E collab + offline tests.

**Phase 3 — Product (4–8 weeks)**
Multi-file projects, compile pipeline with structured errors + bib support, email verification/password reset, role enforcement, presence UI, Monaco LaTeX language support, PWA offline shell, version history.

**Phase 4 — Scale & ops (ongoing)**
Redis pub/sub for WS, observability stack, load testing, admin dashboard, backups/DR, dependency pruning, accessibility/mobile polish.

**Phase 5 — Agent access & distribution (fast-follow after Phases 2–3)**
Scoped personal access tokens, `@synctex/mcp` (BYO-agent editing + compile loops), per-token rate limits, server-enforced agent attribution in presence and version history (§5.7; `implementation.md` §13). Not launch-gated — depends on sync correctness and structured compile errors being solid first.

---

## 11. Quick Wins (do immediately, < 1 day each)

1. Raise `maxMessageSize` in `websocket/client.go` (unblocks basic collab even pre-rewrite).
2. Add membership checks to snapshot/download/upload/tree/WS handlers.
3. Add the `project_files` migration.
4. Delete `\ima` hack, `fmt.Printf("cookies\n")`, `/hello-world`; stop logging document content.
5. Fix snapshot INSERT → true upsert + index.
6. Fix `BaseEditor` WS URL construction and remove the dead `localStorage` token read.
7. Move default document content to project creation on the server.
8. Set `gin.ReleaseMode`, trusted proxies, and a real `/health`.

---

## 12. Positioning — why build this when Overleaf owns the market

Overleaf is not beaten at being Overleaf; SyncTeX wins on the axes Overleaf structurally and commercially cannot follow:

1. **Offline-first is an architectural moat.** Overleaf is built on Operational Transformation with a central server mediating every edit — offline support would require rewriting their sync core and migrating a decade of live documents. CRDT-native gets offline, merge-on-reconnect, and connection-loss resilience as foundation, not feature. The moat only holds if offline works flawlessly — which is why sync correctness is Phase 2, ahead of all product work.
2. **Uncapped free collaboration is counter-positioning.** Overleaf's collaborator caps and compile timeouts *are* its monetization funnel; matching us means dismantling its own revenue model. The users this bites hardest — course groups, unfunded research teams, whole classes on one document, low-connectivity campuses — are our beachhead, and both differentiators compound there.
3. **Lightweight self-hosting.** Overleaf CE is a heavy multi-service deployment with key features behind paid Server Pro; our five-container stack is runnable by a department sysadmin. "Your documents never leave the university" + every deployment is free distribution (GitLab/Gitea playbook).
4. **Agent-native (MCP).** A CRDT backend makes an AI agent a first-class collaborator; structured compile errors give it an autonomous fix loop; self-hosting keeps it private ("your AI, your server, your thesis"). BYO-agent, zero inference cost — the AI assistant funnel Overleaf sells as a closed premium feature, we expose as an open surface.

**What we don't claim:** feature parity (template gallery, journal integrations, track changes), preview fidelity (our HTML preview is an instant approximation; theirs is the compiled PDF), or immunity to Typst on the "replace LaTeX entirely" flank — different bet, different market.

**Sustainability (decide before launch messaging):** unlimited genuinely means unlimited *when self-hosted*; the hosted instance runs generous fair-use quotas that exist to stop abuse, not to monetize; long-term revenue is institutional hosting/support. This keeps the "no artificial limits" promise honest without promising bankruptcy.

**The pitch:** Overleaf sells you back your collaborators and your compile minutes, and stops working when the wifi does. SyncTeX is local-first LaTeX — your document lives with you, works offline, merges when you reconnect, collaborates without seat limits, welcomes your AI as a labeled co-author, and runs on your own server if you want it to.

---

## 13. Tech Stack (decided) — and why

Full per-choice rationale lives in `implementation.md` §0.1; this is the shape and the reasoning pattern.

| Tier | Stack |
|---|---|
| Frontend | Next.js + TypeScript, Monaco, Yjs (+ y-monaco, y-indexeddb), KaTeX, PWA |
| API | Go + Gin, sqlc, Ed25519 JWT + rotating refresh sessions |
| Sync | Node + Hocuspocus (Yjs server), Redis scale-out, Postgres persistence |
| Compile | Go worker + asynq queue, TeX Live + latexmk in per-job sandboxed containers |
| Data | PostgreSQL (Neon), Redis (queue/pub-sub/limits/tickets), S3-compatible object storage (B2; MinIO in dev), IndexedDB client-side |
| Edge & infra | Caddy (single origin, auto-TLS), Docker, Terraform, GitHub Actions |
| Quality & ops | Playwright, testcontainers, k6, zerolog/pino, Prometheus, OpenTelemetry, Sentry |
| Agent access | `@synctex/mcp` (TypeScript) + scoped PATs |

Three principles generated every row:

1. **Keep what works, replace what's broken.** Go/Gin/Next/Monaco/Yjs/KaTeX survive from the prototype because they were the right choices; the WS relay, gotex, and hand-written API clients are replaced because they were not. No rewrite for taste.
2. **Buy correctness, build differentiation.** Hocuspocus, latexmk, asynq, Caddy are bought because their problem domains (sync protocol, TeX builds, job semantics, TLS) are solved and undifferentiated. The preview parser, offline UX, structured compile errors, and MCP surface are built because they *are* the product.
3. **Boring where boring wins.** Postgres, Redis, Terraform, GitHub Actions, Prometheus — a 4-person team spends its novelty budget on the product, not the plumbing.

**Repository: monorepo** (`apps/web|api|sync|compile-worker`, `packages/shared|mcp|latex-language`, `infra/`) — replacing the current two-repo split. One PR changes a service and its consumers atomically; the OpenAPI-generated client in `packages/shared` makes API/frontend drift a compile error instead of a runtime surprise (the current hand-written `lib/api/endpoints/` drifting from the Go handlers is exactly the disease); system-level test suites (authz matrix, sandbox, e2e) live where their subject lives — the composition. Monorepo costs (CI weight, tooling at scale) are hundreds-of-engineers problems; the benefits are four-engineers benefits. Details: `implementation.md` §0.2.
