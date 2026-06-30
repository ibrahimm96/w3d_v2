# Deploying Water 3D (single server, Docker Compose)

Production stack: **Caddy** serves the static frontend, reverse-proxies the
weather APIs under `/api/*` (the prod replacement for the Vite dev proxy), and
fronts **PocketBase** at `pb.<domain>` — all with automatic HTTPS.

```
            ┌──────────────── Caddy (web) ────────────────┐
 visitor ──▶│  <domain>      → static SPA (dist/)          │
   (https)  │                + /api/* → weather upstreams  │
            │  pb.<domain>   → pocketbase:8090             │
            └──────────────────────┬──────────────────────┘
                                   │ (internal network only)
                            ┌──────▼──────┐
                            │ pocketbase  │  pb_data volume
                            └─────────────┘
```

## Prerequisites

- A server with Docker + Compose, ports **80** and **443** open.
- A domain with **two** DNS A records pointing at the server:
  - `<domain>` — the app
  - `pb.<domain>` — PocketBase
- (Auto-TLS needs the domains resolving to this box before first boot.)

## One-time setup

```bash
# 1. Frontend prod config (baked into the bundle at build time)
cp ../frontend/.env.production.example ../frontend/.env.production
#    edit .env.production: set VITE_POCKETBASE_URL=https://pb.<domain>
#    and a URL-restricted Mapbox token.

# 2. Edge config (domain + ACME email)
export DOMAIN=fields.example.com
export ACME_EMAIL=you@example.com
#    (or put these in deploy/.env, which compose reads automatically)

# 3. Build + start
docker compose -f docker-compose.prod.yml up -d --build

# 4. Create the PocketBase admin (first run only)
docker compose -f docker-compose.prod.yml exec pocketbase \
  /usr/local/bin/pocketbase superuser create admin@example.com '<strong-password>'
```

Visit `https://<domain>`, then sign up / log in via the header user menu.
PocketBase admin UI: `https://pb.<domain>/_/`.

## Updating

- **Frontend change** → rebuild the web image (the bundle is baked in):
  `docker compose -f docker-compose.prod.yml up -d --build web`
- **Proxy/TLS change** (`Caddyfile`) → it's mounted, so just reload:
  `docker compose -f docker-compose.prod.yml exec web caddy reload --config /etc/caddy/Caddyfile`

## Production checklist

- [ ] `frontend/.env.production` created with the **public** `pb.<domain>` URL (not `127.0.0.1`).
- [ ] Mapbox token **URL-restricted** in the Mapbox dashboard (it's public in the bundle).
- [ ] **Pin** the PocketBase image to a specific version in `docker-compose.prod.yml`
      (currently `:latest`).
- [ ] Strong PocketBase admin password (not the placeholder).
- [ ] In PocketBase admin → Settings, confirm the **CORS / allowed origins** permit
      `https://<domain>` if logins are rejected cross-origin.
- [ ] Back up the **`pb_data`** volume on a schedule
      (`docker run --rm -v water3d_pb_data:/data -v "$PWD":/backup alpine tar czf /backup/pb_data.tgz -C /data .`).
- [ ] (Optional) Enable the `Content-Security-Policy` header in `Caddyfile` once all
      sources are confirmed loading.
- [ ] (Optional) Auth hardening in PocketBase: email verification, password reset,
      login rate limits.

## Notes / known constraints

- **Weather APIs must stay on the `/api/*` proxy paths.** The app calls relative
  paths that Caddy maps to the upstream hosts (`handle_path` strips the prefix,
  exactly like the Vite dev proxy). Pointing the `VITE_*_PROXY_BASE_URL` vars at the
  upstreams directly will hit CORS.
- **PocketBase is browser-facing.** The SDK runs client-side, so `VITE_POCKETBASE_URL`
  must be the public `https://pb.<domain>` — an `http://` or `127.0.0.1` value will
  fail (mixed content / wrong host) for real visitors.
- **PocketBase is not published to the host**; it's reachable only through Caddy.
  Manage it at `https://pb.<domain>/_/`.
- localStorage remains the always-on base layer; the app still works if PocketBase
  is down (fields just don't sync until it's back).
