# One image for Render: Go serves the API under /api/v1 and the built SPA (docs/plan.md, Architecture).
# Migrations are not run here or at startup; Mateus applies them with `make migrate` (ADR 0002).

# 1. Build the SPA.
FROM node:22.22-alpine AS web
WORKDIR /web
RUN corepack enable
COPY web/package.json web/yarn.lock web/.yarnrc.yml ./
RUN yarn install --immutable
COPY web/ ./
RUN yarn build

# 2. Build the API as a static binary.
FROM golang:1.26-alpine AS api
WORKDIR /api
COPY api/go.mod api/go.sum ./
RUN go mod download
COPY api/ ./
RUN CGO_ENABLED=0 go build -trimpath -ldflags="-s -w" -o /server ./cmd/server

# 3. Run as a non-root user in a minimal image with CA certificates (needed for Neon's TLS).
FROM gcr.io/distroless/static-debian12:nonroot
WORKDIR /app
COPY --from=api /server /app/server
COPY --from=web /web/dist /app/web
ENV WEB_DIR=/app/web
# Render sets PORT; 8080 is the local default.
ENV PORT=8080
EXPOSE 8080
ENTRYPOINT ["/app/server"]
