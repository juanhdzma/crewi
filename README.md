# crewi

Browser games for remote team building. Create a party, share the link, and play together while the team talks on its usual video call.

No accounts and no stored data: everything lives in server memory and disappears when the party is empty for 30 minutes or the server restarts.

## Features

- Create or join a party with a link; pick a name and a camera photo or an emoji.
- Live lobby with online presence and a host who picks the games; during a game a side panel shows who already answered.
- Light and dark theme that follows the system, with a toggle.
- Rejoin the same seat after a refresh or after closing the browser, or leave the party from the home page.

## Games

| Game | Points | Description |
| --- | --- | --- |
| Who is most likely | No | The host builds the round one question card at a time; everyone votes for a teammate and the results land on a podium. |
| Ventana | Yes | Each player shows their window on the call, with hints of what to describe; the others guess where it is on a map. Locations can be exact or an approximate circle. |

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

Serve it behind HTTPS. Browser geolocation (Ventana) and the camera (join photo) only work in a secure context.

## Docs

- [Architecture](docs/ARCHITECTURE.md)
