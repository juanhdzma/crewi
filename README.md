# crewi

Browser games for remote team building. Create a party, share the link, and play together while the team talks on its usual video call.

No accounts and no stored data: everything lives in server memory and disappears when the party is empty for 30 minutes or the server restarts.

## Features

- Create or join a party with a link; pick a name and an avatar.
- Live lobby with online presence and a leader who picks the games.
- Rejoin the same seat after a refresh or after closing the browser, or leave the party from the home page.

## Games

| Game | Points | Description |
| --- | --- | --- |
| Who is most likely | No | The leader picks questions; everyone votes for a teammate and the leader reveals the results. |
| Ventana | Yes | Planned. Guess where each teammate's window is on a map. |

To add questions to Who is most likely, add lines to `internal/game/mostlikely/questions.txt`. Each line completes "¿Quién es más probable que..." and the file is embedded at build time, so rebuild after editing it.

## Run locally

Requirements: Go 1.26 and Node 24 or later.

| Task | Command |
| --- | --- |
| Backend | `go run ./cmd/crewi` (needs `web/dist`, see build) |
| Frontend with hot reload | `cd web && npm install && npm run dev`, then open http://localhost:5173 |
| Build frontend | `cd web && npm run build` |
| Tests | `go test ./...` and `cd web && npm test` |
| Docker image | `docker build -t crewi .` |

The Vite dev server proxies `/api` and `/ws` to the Go server on port 8080.

## Configuration

| Variable | Default | Description |
| --- | --- | --- |
| `PORT` | `8080` | HTTP port |

## Deployment

Serve it behind HTTPS. Browser geolocation, used by Ventana, only works in a secure context.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
