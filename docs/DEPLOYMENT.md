# Deployment

crewi is one container with no volumes and no database. One instance is enough for the expected load, and it must be exactly one: parties live in the memory of a single process.

## Image

Every push to `master` that passes the tests publishes two tags to GitHub Container Registry:

- `ghcr.io/juanhdzma/crewi:latest`
- `ghcr.io/juanhdzma/crewi:<commit sha>`, to pin or roll back

## Compose

```yaml
services:
  crewi:
    image: ghcr.io/juanhdzma/crewi:latest
    ports:
      - "8080:8080"
    restart: unless-stopped
```

The same file is at the repository root as `docker-compose.yml`, with `build: .` added so `docker compose up --build` works from a checkout. Set `PORT` to change the port the server listens on inside the container.

## HTTPS

Put the container behind a reverse proxy or tunnel that terminates TLS. Browsers only grant geolocation (Ventana) and the camera (join photo) in a secure context, so over plain HTTP those features fail everywhere except `localhost`.

The proxy must forward WebSocket upgrades on `/ws/`.

## Upgrades

Pull the new image and recreate the container. A restart wipes every party in progress; that is accepted by design, so upgrade when nobody is playing.

There is nothing to back up.
