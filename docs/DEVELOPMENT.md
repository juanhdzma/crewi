# Development

## Prerequisites

- Go 1.27 or later
- Node 24 or later

## Local setup

The Go binary embeds `web/dist`, so the frontend must be built once before the backend compiles.

```bash
cd web && npm install && npm run build
cd .. && go run ./cmd/crewi
```

The server listens on http://localhost:8080 and serves the embedded frontend.

For frontend work with hot reload, keep the Go server running and start Vite in another terminal:

```bash
cd web && npm run dev
```

Open http://localhost:5173. The Vite dev server proxies `/api` and `/ws` to the Go server on port 8080.

To test with several players on one machine, open the party link in separate browser profiles or private windows. Two tabs of the same profile share a seat, and the older tab is disconnected.

## Tests

| Command | Covers |
|---|---|
| `go vet ./... && go test ./...` | Party rules, both games and the HTTP and WebSocket transport |
| `cd web && npm test` | Pure frontend logic (formatting, standings, podium, presence, theme) with Vitest |
| `cd web && npm run build` | Type check with `tsc`, then the production bundle |

CI runs the three on every pull request and on pushes to `master` (`.github/workflows/docker.yml`).

## Common changes

**Add questions to ¿Quién es más probable?** Add lines to `internal/game/mostlikely/questions.txt`, one question per line, each completing "¿Quién es más probable que…". The file is embedded at build time.

**Add a game.** Implement the `Game` interface from `internal/game/game.go` in a new package under `internal/game/`, add it to the game factory map in `internal/party/party.go`, then add its entry to `web/src/games.ts` and its screen to the `Room` switch in `web/src/PartyPage.tsx`. Game rules are tested without HTTP; see `internal/game/ventana/ventana_test.go`.

## Conventions

- Dependencies point inward: `internal/server` depends on `internal/party`, never the reverse.
- Code and identifiers are in English; the interface copy is in Spanish, following the voice in [DESIGN.md](DESIGN.md) and [PRODUCT.md](PRODUCT.md).
- No comments in code, except to explain a non-obvious workaround.
