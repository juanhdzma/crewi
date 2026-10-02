FROM node:24-alpine AS web
WORKDIR /src/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

FROM golang:1.27-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
COPY --from=web /src/web/dist ./web/dist
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /crewi ./cmd/crewi

FROM gcr.io/distroless/static-debian13:nonroot
COPY --from=build /crewi /crewi
EXPOSE 8080
ENTRYPOINT ["/crewi"]
