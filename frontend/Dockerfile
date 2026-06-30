# syntax=docker/dockerfile:1

# ---- build stage: compile the static bundle -------------------------------
# Vite bakes VITE_* values into the bundle at build time, reading .env.production
# (copied in below). Rebuild the image whenever those values or the source change.
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# ---- runtime stage: Caddy serves dist + proxies the APIs ------------------
# The Caddyfile itself is mounted at runtime (see deploy/docker-compose.prod.yml)
# so proxy/TLS config can change without rebuilding the image.
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
