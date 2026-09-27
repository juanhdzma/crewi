# Architecture

## System Context

crewi is a browser-based suite of team building games for remote teams. The team talks over its usual video call; crewi runs the game on each person's screen.

- No accounts, no login. A party is created and joined through a link; each player picks a name and an avatar.
- No persistence. All state lives in the memory of a single Go process. A restart wipes every party, and that is accepted.
- A party outlives its games: when a game ends, players return to the lobby and the leader can start another one.
- Expected load: up to 20 players per party and a handful of parties at the same time. One instance is enough.
- Outbound dependencies: map tiles from OpenStreetMap, loaded by the browser. The server calls nothing external.

## Components

| Component | Responsibility |
| --- | --- |
| `cmd/crewi` | Entry point. Wires the HTTP server and embeds the built frontend. |
| `internal/party` | Parties, players, leader rules, game lifecycle. Pure Go, no HTTP. |
| `internal/server` | HTTP API and WebSocket transport. Translates messages into `party` calls. |
| `web` | React + TypeScript + Vite frontend, embedded into the Go binary at build time. |

Dependencies point inward: `server` depends on `party`, never the reverse. Game rules are tested without HTTP or WebSockets.

## Protocol

1. `POST /api/parties` creates a party and returns its `code`. The link is `/p/{code}`.
2. `GET /api/parties/{code}` returns 404 when the party does not exist.
3. `POST /api/parties/{code}/leave` with `{"token": "..."}` removes a player without an open connection.
4. `GET /ws/{code}` opens a WebSocket. The first client message is `join` with name, avatar and an optional token.
5. The server answers `welcome` with the player id and token. The browser keeps the party code and token in `localStorage`, so closing the browser does not lose the seat.
6. If the same player connects from another tab, the old tab receives `replaced` and stops reconnecting.
7. Clients send actions as `{"type": "...", "payload": {...}}`. After every change the server sends each player a full `state` snapshot built for that player.

Snapshots are per player because games hide information (guesses before the reveal, real locations). Full snapshots instead of diffs make reconnection trivial: a reconnecting client just receives the current state.

## Party Rules

- The first player to join becomes leader. Only the leader starts and controls games.
- A player who disconnects stays in the party as offline and can reconnect with their token, from the party link or from the home page.
- Leaving removes the player; it works from the lobby or from the home page.
- If the leader is offline for more than 30 seconds, leadership passes to the longest-connected online player.
- A party with no connected players for 30 minutes is deleted.

## Games

Each game implements one Go interface and declares whether it keeps score.

### Ventana (scored)

1. Setup: each player shares their location. They accept the browser geolocation prompt and confirm the pin, or drop it manually on the map.
2. Each player chooses a privacy mode: exact point, or a circle (radius chosen by the player). The circle center is randomly offset so the real location is not its center.
3. Turns follow a random order. On their turn, a player shows their window on the video call.
4. The others place a guess. The map is limited to a box of about 50 km around the target, with the box center randomly offset so it does not reveal the answer. Players can pan and zoom inside the box.
5. When everyone has guessed, the target (point or circle) and all guesses are revealed.
6. Score per guess: `round(5000 * exp(-d / k))`, where `d` is the distance to the point, or to the circle edge (0 inside the circle). `k` starts at 5 km and is tunable.
7. After every player has had a turn, the highest total wins.

### Who is most likely (unscored)

1. The leader picks questions from a built-in bank.
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
| 2026-09-27 | Leaflet + OpenStreetMap tiles | No API key or billing | Google Maps JS API |
| 2026-09-27 | Random-offset bounding box as the map hint | Narrows the search without leaking the answer and needs no geocoding service | Reverse geocoding the city name |

## Not Built for v1

- Horizontal scaling. Parties live in one process; revisit only if one instance stops being enough.
- Custom questions for Who is most likely. The bank is embedded.
- City name hints via reverse geocoding.

## Operational Notes

- Browser geolocation requires HTTPS. The deploy must sit behind TLS (reverse proxy or tunnel).
