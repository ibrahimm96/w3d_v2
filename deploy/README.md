# Deploying Water 3D (single container, one domain)

Production runs as **one Docker container** on **one domain**. Inside it,
**Caddy** serves the static frontend, reverse-proxies the weather APIs under
`/api/*` (the prod replacement for the Vite dev proxy), and proxies
**PocketBase** (auth + field storage) under `/pb/*` — all with automatic HTTPS.

```
                    ┌──────────── water3d container ────────────┐
 visitor ──https──▶ │  Caddy                                     │
   (:80 :443)       │   <domain>       → static SPA (dist/)      │
                    │                  + /api/*  → weather APIs   │
                    │                  + /pb/*   → PocketBase ─┐  │
                    │                                          │  │
                    │  PocketBase (127.0.0.1:8090) ◀───────────┘  │
                    │   auth + fields          pb_data volume     │
                    └─────────────────────────────────────────────┘
      admin UI (/_/): host loopback only → ssh -L 8090:localhost:8090 <server>
```

Both processes run under `supervisord`; logs from both stream to
`docker compose logs -f`.

## Prerequisites

- A server with Docker + Compose, ports **80** and **443** open.
- A domain with a **single** DNS A record pointing at the server.
- (Auto-TLS needs the domain resolving to this box before first boot.)

## One-time setup

```bash
cd deploy

# 1. Frontend prod config (baked into the bundle at build time)
cp ../frontend/.env.production.example ../frontend/.env.production
#    edit .env.production: set VITE_POCKETBASE_URL=https://<domain>/pb
#    and a URL-restricted Mapbox token.

# 2. Edge config (domain + ACME email)
export DOMAIN=fields.example.com
export ACME_EMAIL=you@example.com
#    (or put these in deploy/.env, which compose reads automatically)

# 3. Build + start
docker compose up -d --build

# 4. Create the PocketBase admin (first run only)
docker compose exec app /usr/local/bin/pocketbase \
  superuser create admin@example.com '<strong-password>' --dir=/pb/pb_data
```

Visit `https://<domain>`, then sign up / log in via the header user menu.

## The PocketBase admin dashboard

The dashboard (`/_/`) is **not** exposed on the public domain — it doesn't render
correctly under a subpath, and keeping it off the internet is safer. It's bound
to the **host's loopback** only. Reach it over SSH:

```bash
ssh -L 8090:localhost:8090 <server>
# then open http://localhost:8090/_/
```

Day-to-day you rarely need it: the superuser is created via the CLI (step 4) and
regular users self-register through the app's **Sign up** form.

## Updating

- **Frontend / migrations change** → rebuild the image (the bundle is baked in):
  `docker compose up -d --build`
- **Proxy/TLS change** (`Caddyfile`) → it's mounted, so just reload:
  `docker compose exec app caddy reload --config /etc/caddy/Caddyfile`

## Production checklist

- [ ] `frontend/.env.production` created with the **public** `https://<domain>/pb`
      URL (not `127.0.0.1`, no `pb.` subdomain).
- [ ] Mapbox token **URL-restricted** in the Mapbox dashboard (it's public in the bundle).
- [ ] **Pin** the PocketBase image tag in `deploy/Dockerfile`
      (currently `ghcr.io/muchobien/pocketbase:latest`).
- [ ] Strong PocketBase admin password (not the placeholder).
- [ ] In the PocketBase admin → Settings, set the **Application URL** to
      `https://<domain>/pb` (used in verification/reset email links).
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
- **PocketBase is browser-facing** at `https://<domain>/pb`. The SDK runs
  client-side, so `VITE_POCKETBASE_URL` must be that public https path — an
  `http://` or `127.0.0.1` value fails (mixed content / wrong host) for real visitors.
- **`/api/*` is reserved for the weather proxies**, which is why PocketBase lives
  at `/pb/*` and not the root — its own API is also under `/api/*` and would collide.
- localStorage remains the always-on base layer; the app still works if PocketBase
  is down (fields just don't sync until it's back).
