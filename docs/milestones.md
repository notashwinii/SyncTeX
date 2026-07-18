# SyncTeX — Milestones

Sequential delivery plan derived from `implementation.md` (§ references point there). Rules:

1. **Every milestone ends in a working, demoable stage** deployed to staging — never a half-rewired app. Where a rewrite replaces a subsystem, the old path keeps working until the new one lands whole within that same milestone.
2. A milestone is done when its **demo script** runs clean and its **exit criteria** are green in CI — not when the code is merged.
3. Durations assume ~4 focused people. Milestones 3 and 4 can overlap (different services); everything else is sequential.

---

## M0 — It runs anywhere (~1 week)

**Goal:** the existing prototype becomes reproducible and testable; foundation for everything after.

**Scope:** monorepo restructure (`apps/*`, `packages/*`, `infra/`) · docker-compose dev env (Postgres, Redis, MinIO, Caddy, api, web) · config layer with boot validation (§8) · missing `project_files` migration · delete debug leftovers (`\ima` checks, `fmt.Printf`, `/hello-world`, content logging) · CI skeleton: lint, `go test -race`, `tsc`, migrations against clean Postgres · sqlc adoption started · quick-win fixes from `plan.md` §11 that don't conflict with later rewrites (WS message cap raise, snapshot upsert, `gin.ReleaseMode`, real `/healthz`).

**Working stage / demo:** fresh laptop → `git clone` → `docker compose up` → sign up, create a project, edit with live preview, two browsers see each other's edits (prototype-quality), all in under 10 minutes with zero manual setup.

**Exit criteria:**
- [ ] CI green on a clean checkout; migrations apply to an empty database
- [ ] No secrets in repo; boot fails loudly listing missing env vars
- [ ] Grep-clean: no debug prints, no document-content logging

---

## M1 — Locked doors (~2–3 weeks)

**Goal:** nothing is publicly reachable that shouldn't be. The app behaves identically for legitimate users; every hole from the audit is closed.

**Scope:** single-origin deployment behind Caddy (§0) · auth rebuild: Ed25519 access JWT + rotating opaque refresh tokens with grace window, `auth_sessions` table, cookie-only (§1.1–1.2) · email verification + password reset + email change (§1.2) · authz layer: `RequireProject`/`RequireWorkspace` on **every** route, role enum migration, authz matrix test (§2) · CSRF middleware (§8) · rate limiting (§7, human-facing rows) · upload validation interim (size caps, MIME sniff on the existing path) · error envelope, graceful shutdown, trusted proxies (§8) · transactional email provider + SPF/DKIM (§12).

**Working stage / demo:** same user-visible app as M0, but: a second account cannot read/write/join another user's project by UUID (live demo of the 403/404s); a stolen refresh token dies on the victim's next refresh and trips a `SESSION_COMPROMISED` alert; password reset email arrives in inbox (not spam) and logs out the other browser; login brute-force locks and notifies.

**Exit criteria:**
- [ ] Authz matrix test covers every route × every role, green; route-walker fails CI on unmatrixed routes
- [ ] Token-reuse family revocation integration test green
- [ ] No token in any log, URL, or response body (asserted in e2e proxy)
- [ ] Rate limiter verified under k6 brute-force scenario

---

## M2 — Collaboration that actually works (~3–4 weeks)

**Goal:** the headline feature becomes true. Old WS relay and snapshot endpoints deleted; sync service carries all editing.

**Scope:** Hocuspocus sync service with Redis + Postgres persistence (`doc_updates`/`doc_snapshots`, compaction) (§3.2) · WS ticket flow + revocation pub/sub incl. logout kick (§1.3) · client rewrite: `useCollabDoc`, provider lifecycle/teardown, connection state machine, recovery-export dialog, per-file IndexedDB (§3.3) · server-side default content seeding (§3.2) · sync SIGTERM drain (§3.2) · legacy `snapshots` data migration, legacy editor route deleted (§3.3) · doc size caps with typed close codes.

**Working stage / demo:** two browsers type in the same sentence simultaneously — converges; one goes offline (devtools), edits for five minutes while the other keeps typing, reconnects — merges with nothing lost and no duplicated template; kill the sync container mid-edit, restart — both clients resync; paste a 2MB chapter — syncs; remove a collaborator mid-session — their socket drops within 1s and their local work offers export.

**Exit criteria:**
- [ ] Offline/reconnect e2e green in CI (Playwright network emulation) — this is the flagship regression test forever
- [ ] Restart-during-edit zero-loss test green; shutdown-flush test green
- [ ] 20MB doc loads < 3s; viewer role cannot mutate (protocol-level assert)
- [ ] Legacy websocket package and snapshot endpoints deleted from the tree

---

## M3 — Real projects, not one buffer (~2–3 weeks)

**Goal:** a thesis-shaped project — chapters, a bibliography, figures — is representable and safe.

**Scope:** `project_files` model with kinds/soft-delete/hygiene rules (NFC, reserved names, cycle guard, main-file guard) (§4.2) · API-authoritative tree ops mirrored to the meta-doc; structural actions disabled offline with explicit UI (§3.2/§4.2) · per-file Yjs docs wired to tabs/file tree · two-phase presigned uploads with sniffing + quotas (§4.2) · purge jobs (project delete → zero S3/doc orphans) · project zip export (§6.7).

**Working stage / demo:** create `main.tex`, `chapters/ch1.tex`, upload `figures/plot.png`; the tree updates live in a second browser; rename and move files while a collaborator edits inside one — nothing breaks; upload a renamed executable — rejected; delete the project — storage audit shows zero orphans; export the zip and extract it on Windows.

**Exit criteria:**
- [ ] Tree ops propagate live and survive reconnect (e2e)
- [ ] Upload validation suite green (spoofed MIME, oversize, traversal names, reserved names)
- [ ] Purge-job integration test against MinIO shows zero orphans
- [ ] Offline banner correctly gates structural actions (e2e)

---

## M4 — Real PDFs, safely (~2–3 weeks; can overlap M3)

**Goal:** publication-quality output from a pipeline that can't hurt us.

**Scope:** asynq queue + compile-worker with sandboxed `latexmk` (no network, tmpfs, cgroups, 120s kill, no-shell-escape) (§5.2) · fingerprinted input staging from sync-materialized text + assets (§5.2) · structured log parser with golden-file corpus (§5.2) · compile REST (enqueue/status/dedupe, per-user budget) · PDF + log artifacts to S3 with retention · Monaco error markers + problems panel (§6.1) · old `download.go`/gotex path deleted.

**Working stage / demo:** compile a multi-file project with `\includegraphics` and a `.bib` — correct PDF downloads; introduce an undefined command — compile fails with the error listed in the problems panel, click jumps to file+line; submit `\input{/etc/passwd}` and `\def\x{\x}\x` — clean failures, no leak, no hung worker; 20 users compile at once — queue drains, editing stays snappy.

**Exit criteria:**
- [ ] Sandbox escape/DoS suite green in CI against the real worker image (§5.3)
- [ ] Bibliography + images e2e green
- [ ] Log-parser corpus green (missing package, undefined cs, bib error, timeout, OOM)
- [ ] Compile load test: 20 concurrent, API p95 unaffected

---

## M5 — Feels like a product (~2–3 weeks)

**Goal:** the polish layer that separates "works" from "people choose it".

**Scope:** Monaco LaTeX language: highlighting, completion, `\label`/`.bib` citation completion (§6.1) · presence cursors with names/colors (§6.1) · sync-status pill, read-only banner (§3.3/§6.1) · invitations lifecycle hardening + roles UI + ownership transfer (§6.3) · version history: auto + named versions, restore-as-update, retention (§6.4) · PWA offline shell — app opens and edits with no network (§6.5) · preview parser hardening: worker thread, depth caps, XSS bans in CI (§6.2).

**Working stage / demo:** open the app in airplane mode — it loads, a previously-opened project is editable, reconnect syncs; a collaborator's named cursor moves live; typing `\cite{` completes from the project's `.bib`; restore yesterday's version while a collaborator is editing — they converge; demote someone to viewer — their editor goes read-only in real time.

**Exit criteria:**
- [ ] PWA offline-launch e2e green (release-gating from here on)
- [ ] Parser fuzz (never throws) + XSS corpus green; `dangerouslySetInnerHTML` ban enforced by eslint
- [ ] Version restore convergence e2e green
- [ ] Invitation lifecycle suite green (expiry, dedupe, double-accept, case normalization)

---

## M6 — Launchable (~2 weeks)

**Goal:** we can put a URL on a poster and sleep at night.

**Scope:** observability full stack: structured logs, metrics, tracing, Sentry, the §9 alert set firing in a staging chaos drill · staging/prod environments, Terraform, CD with migration gating (§10) · load test at target (100 rooms × 5 clients, 20 concurrent compiles) · backup restore drill · compliance surface: ToS/privacy, security.txt, account export + verified deletion, DMARC enforced (§12) · admin minimum: user disable, queue dashboard (§6.6) · external pen-test pass on auth + sandbox.

**Working stage / demo:** the **public beta**. Chaos drill on staging: kill Redis — banner appears, editing continues, compile 503s cleanly, alerts fire, recovery is automatic; deploy mid-editing-session — nobody notices; the full launch-gate checklist (§11) walked live.

**Exit criteria:** the §11 launch gate checklist, verbatim — every box.

---

## M7 — Agent-native (~1–2 weeks, post-launch fast-follow)

**Goal:** the differentiator on top of the solid core: any AI agent is a first-class, labeled collaborator.

**Scope:** PATs: schema, middleware, effective-role capping, management UI (§13.2) · agent rate-limit rows + per-token compile budgets (§7) · `@synctex/mcp` package: stdio server, tool surface, headless provider client (§13.3) · server-enforced agent attribution in presence + version history (§13.4) · docs page: "Connect Claude to SyncTeX in 2 minutes".

**Working stage / demo:** `npx @synctex/mcp` in Claude Code config → ask Claude to fix a broken build: it reads the file, edits (its labeled cursor visible to the human typing in the same document), compiles, reads the structured errors, fixes, goes green — autonomously, within its token budget; revoke the PAT — the agent's socket dies within 1s. Same demo against a self-hosted instance.

**Exit criteria:** §13.5 acceptance criteria, all four — plus PAT route-allowlist enforced in the route-walker test.

---

## M8 — Grows with demand (ongoing)

Multi-instance sync via the Redis extension under load · compile-status push replacing polling (§5.2 debt) · distributed compile worker pool autoscaling · admin/analytics build-out · accessibility + mobile pass · institutional self-host documentation and versioned release channel. No fixed demo — this milestone is run by the §9 dashboards and user feedback, not a checklist.

---

## Timeline summary

| Milestone | Duration | Cumulative | You can demo… |
|---|---|---|---|
| M0 Runs anywhere | 1 wk | wk 1 | one-command reproducible dev env |
| M1 Locked doors | 2–3 wk | wk 4 | closed authz/auth holes, live |
| M2 Collaboration works | 3–4 wk | wk 8 | offline → reconnect → perfect merge |
| M3 Real projects | 2–3 wk | wk 10* | multi-file thesis with figures |
| M4 Real PDFs | 2–3 wk | wk 11* | sandboxed compile + click-to-error |
| M5 Feels like a product | 2–3 wk | wk 13 | PWA offline, presence, versions |
| M6 Launchable | 2 wk | wk 15 | **public beta** |
| M7 Agent-native | 1–2 wk | wk 17 | Claude fixing your build, labeled |

\* M3/M4 overlap. Total to public beta: **~15 weeks**; to the full differentiated story: **~17 weeks**.
