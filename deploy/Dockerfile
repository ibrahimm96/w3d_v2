# syntax=docker/dockerfile:1
#
# Single-container production image for Water 3D.
#
#   Caddy       TLS + static SPA + /api/* weather proxies + /pb/* → PocketBase
#   PocketBase  auth + owner-scoped field storage (loopback only)
#
# Both run under supervisord. Build context is the REPO ROOT (see
# deploy/docker-compose.yml) so this can pull in the frontend source and the
# PocketBase migrations. Rebuild whenever the frontend, migrations, or the
# baked-in VITE_* values (frontend/.env.production) change.

# ---- build stage: compile the static SPA bundle ---------------------------
# Vite bakes VITE_* values into the bundle at build time, reading
# frontend/.env.production. Rebuild the image whenever those values change.
FROM node:22-alpine AS build
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- pocketbase stage: source of the pinned PocketBase binary -------------
# Pin a specific tag for reproducible prod builds (any release >= 0.23 supports
# the JSVM migrations), e.g. ghcr.io/muchobien/pocketbase:0.28.4.
FROM ghcr.io/muchobien/pocketbase:latest AS pocketbase

# ---- runtime stage: Caddy + PocketBase supervised in one container --------
FROM caddy:2-alpine
RUN apk add --no-cache supervisor

# PocketBase binary (static Go build — runs as-is on alpine)
COPY --from=pocketbase /usr/local/bin/pocketbase /usr/local/bin/pocketbase

# Static SPA bundle served by Caddy
COPY --from=build /app/dist /srv

# Migrations applied by PocketBase on first boot
COPY pocketbase/pb_migrations /pb/pb_migrations

# Process + edge config
COPY deploy/supervisord.conf /etc/supervisord.conf
COPY deploy/Caddyfile /etc/caddy/Caddyfile

EXPOSE 80 443
CMD ["supervisord", "-c", "/etc/supervisord.conf"]
