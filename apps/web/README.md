# SyncTeX Web

Next.js 15 frontend for the collaborative Monaco/Yjs editor, project and
workspace management, live preview, and PDF download.

## Run locally

```sh
cd apps/web
bun install
bun run dev
```

The app listens on `http://localhost:3000`. Configure API and collaboration
endpoints when they differ from the local defaults:

```sh
NEXT_PUBLIC_API_URL=http://localhost:8080/api
NEXT_PUBLIC_WS_URL=ws://localhost:8080
```

The API authenticates browser requests and WebSocket upgrades with its
HTTP-only cookies.

## Checks

```sh
bun run check
bun run build
```

`bun install` also configures the repository Husky pre-commit hook.
