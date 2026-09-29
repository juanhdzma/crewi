# Architecture

## System Context

crewi is a browser-based suite of team building games for remote teams. The team talks over its usual video call; crewi runs the game on each person's screen.

- No accounts, no login. A party is created and joined through a link; each player picks a name and an emoji, and can add a camera photo.
- No persistence. All state lives in the memory of a single Go process. A restart wipes every party, and that is accepted.
- A party outlives its games: when a game ends, players return to the lobby and the leader can start another one.
- Expected load: up to 20 players per party and a handful of parties at the same time. One instance is enough.
- Outbound dependencies: Esri World Imagery satellite tiles loaded by the browser (the provider is one constant in `web/src/Ventana.tsx`). The server calls nothing external.

## Components

| Component | Responsibility |
| --- | --- |
| `cmd/crewi` | Entry point. Wires the HTTP server and embeds the built frontend. |
| `internal/party` | Parties, players, leader rules, game lifecycle. Pure Go, no HTTP. |
| `internal/game` | The `Game` interface every game implements, plus one package per game. |
| `internal/server` | HTTP API and WebSocket transport. Translates messages into `party` calls. |
| `web` | React + TypeScript + Vite frontend, embedded into the Go binary at build time. |

Dependencies point inward: `server` depends on `party`, never the reverse. Game rules are tested without HTTP or WebSockets.

## Protocol

1. `POST /api/parties` creates a party and returns its `code`. The link is `/p/{code}`.
2. `GET /api/parties/{code}` returns the emoji list and the online players (for the join screen), or 404 when the party does not exist.
3. `POST /api/parties/{code}/leave` with `{"token": "..."}` removes a player without an open connection.
4. `PUT /api/parties/{code}/photo` with `Authorization: Bearer {token}` stores a JPEG of up to 64 KB for that player; `GET /api/parties/{code}/players/{id}/photo` serves it. The photo lives in memory and is dropped when the player leaves.
5. `GET /ws/{code}` opens a WebSocket. The first client message is `join` with name, avatar and an optional token.
6. The server answers `welcome` with the player id and token. The browser keeps the party code and token in `localStorage`, so closing the browser does not lose the seat.
7. If the same player connects from another tab, the old tab receives `replaced` and stops reconnecting.
8. Clients send actions as `{"type": "...", "payload": {...}}`. After every change the server sends each player a full `state` snapshot built for that player.

Snapshots are per player because games hide information (guesses before the reveal, real locations). Full snapshots instead of diffs make reconnection trivial: a reconnecting client just receives the current state.

## Party Rules

- The first player to join becomes leader. Only the leader starts and controls games.
- A player who disconnects stays in the party as offline and can reconnect with their token, from the party link or from the home page.
- Leaving removes the player; it works from the lobby or from the home page.
- If the leader is offline for more than 30 seconds, leadership passes to the longest-connected online player.
- A party with no connected players for 30 minutes is deleted.

## Games

Game rules run on the server; the frontend only renders the view it receives. Each game implements `game.Game`:

- `Act(table, playerID, action, payload)` validates and applies an action.
- `View(table, playerID)` returns what that player may see.
- `Finished()` tells the party to return to the lobby.

The party handles `startGame` and `endGame` (leader only) and forwards every other action to the running game. Failed actions answer `actionError` to the sender only. Games that keep score include the scores in their view.

### Ventana (scored)

1. Setup: each player shares their location. They accept the browser geolocation prompt and confirm the pin, or drop it manually on the map.
2. Each player chooses a privacy mode: exact point, or a circle of 500 m to 2 km. The circle center is randomly offset (up to 90% of the radius) and the exact point is discarded immediately, so the server never keeps it.
3. The leader starts once at least two players are ready. Turns follow a random order among ready players; players without a location can still guess.
4. On their turn, a player shows their window on the video call. The others place a guess.
5. The guess map is limited to a 12 km box whose center is randomly offset up to 3.5 km from the target (less for large circles, so the whole circle stays inside), so the box narrows the search without revealing the answer. Players can pan and zoom inside it.
6. The turn is revealed automatically when every online guesser has answered; the leader can also reveal early.
7. Score per guess: `round(5000 * exp(-d / 2 km))`, where `d` is the distance to the point, or to the circle edge (0 inside the circle).
8. After the last turn a final ranking is shown until the leader returns to the lobby.

### Who is most likely (unscored)

1. The leader picks questions from a built-in bank: `internal/game/mostlikely/questions.txt`, one question per line, embedded at build time.
2. For each question, every player votes for one player.
3. The leader controls the flow in real time: reveal, next question, or end.
4. The reveal shows who got the votes so the team can discuss.

## Decision Log

| Date | Decision | Why | Alternatives rejected |
| --- | --- | --- | --- |
| 2026-09-27 | Single Go binary with the frontend embedded, one container | Smallest deploy for one-instance load | Separate frontend hosting |
| 2026-09-27 | In-memory state, no database | Product requirement: nothing is persisted | Redis, SQLite |
| 2026-09-27 | One mutex per party | Up to 20 players per party; simplest correct concurrency | Actor goroutine per party |
| 2026-09-27 | Full per-player state snapshots over WebSocket | Hidden information per player and free reconnection | Event diffs |
| 2026-09-27 | Leaflet with Esri World Imagery satellite tiles, no API keys | Keep crewi free with no billing account; satellite imagery fits a game about window views. Esri's terms require an ArcGIS license for this endpoint; move to a free ArcGIS Location Platform key before any public or commercial use | Google Maps JS API (needs billing; rejected to stay free), Stadia Stamen Terrain (style rejected) |
| 2026-09-28 | Player photos over HTTP, with only a revision number in the state | Twenty photos inside every broadcast would resend about 200 KB per vote; a revision lets browsers cache each photo | Base64 photos in the WebSocket state |
| 2026-09-27 | Random-offset bounding box as the map hint | Narrows the search without leaking the answer and needs no geocoding service | Reverse geocoding the city name |

## Not Built for v1

- Horizontal scaling. Parties live in one process; revisit only if one instance stops being enough.
- Custom questions for Who is most likely. The bank is embedded.
- City name hints via reverse geocoding.

## Operational Notes

- Browser geolocation requires HTTPS. The deploy must sit behind TLS (reverse proxy or tunnel).
