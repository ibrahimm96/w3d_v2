# Deploying Water 3D (Traefik edge, *.vistacompute1.ucmerced.edu)

Production runs behind **Traefik** on the `*.vistacompute1.ucmerced.edu`
wildcard — any host in that zone reaches the app (the canonical name is
`water3d.vistacompute1.ucmerced.edu`, which the frontend bakes into
`VITE_POCKETBASE_URL`). Traefik terminates HTTPS with a **wildcard cert**,
reverse-proxies the weather APIs under `/api/*` (the prod replacement for the
Vite dev proxy), and routes **PocketBase** (auth + field storage) under `/pb/*`.
A tiny **nginx** container serves the static SPA.

```
                    ┌──────────── water3d_edge network ─────────────┐
 visitor ──https──▶ │  traefik (:80 :443)                           │
   (:80 :443)       │    *.vistacompute1…   → web (nginx, SPA)      │
                    │      …/api/*          → weather upstreams     │
                    │      …/pb/*           → pocketbase ───────┐   │
                    │                                            │   │
                    │  web (nginx :80)   static dist/            │   │
                    │  pocketbase (:8090) ◀──────────────────────┘   │
                    │    auth + fields        pb_data volume         │
                    └────────────────────────────────────────────────┘
   dashboards (loopback only): traefik :8080/dashboard/ · pocketbase :8090/_/
```

Routing lives in two places:

- **`deploy/traefik/traefik.yml`** — static config: entry points, providers,
  dashboard.
- **`deploy/traefik/dynamic.yml`** — hot-reloaded: the `/api/*` weather proxies
  and shared middlewares (security headers, gzip). This replaces the old
  Caddyfile's `handle_path` blocks (`stripPrefix` = `handle_path`,
  `passHostHeader: false` = `header_up Host`).
- The **web** and **pocketbase** routers are **docker labels** in
  `docker-compose.yml`.

## Prerequisites

- A server with Docker + Compose, ports **80** and **443** open.
- The app's chosen name (e.g. `water3d.vistacompute1.ucmerced.edu`) resolving to
  this box. Any name in the `*.vistacompute1.ucmerced.edu` zone routes to the app.
- A **wildcard TLS cert** for `*.vistacompute1.ucmerced.edu` (from UC Merced IT).
  A wildcard can't be issued by Let's Encrypt HTTP-01 — see *TLS options* below
  for the ACME single-host alternative.

## One-time setup

```bash
cd deploy

# 1. Frontend prod config (baked into the bundle at build time)
cp ../frontend/.env.production.example ../frontend/.env.production
#    edit .env.production: set VITE_POCKETBASE_URL=https://<host>/pb
#    (canonical host, e.g. water3d.vistacompute1.ucmerced.edu) and a
#    URL-restricted Mapbox token.

# 2. Wildcard TLS cert — drop the cert + key into deploy/certs/ (git-ignored):
#    certs/vistacompute1.crt   full chain (leaf + intermediates), PEM
#    certs/vistacompute1.key   private key, PEM

# 3. Build + start
docker compose up -d --build

# 4. Create the PocketBase admin (first run only)
docker compose exec pocketbase /usr/local/bin/pocketbase \
  superuser create admin@ucmerced.edu '<strong-password>' --dir=/pb/pb_data
```

Visit `https://water3d.vistacompute1.ucmerced.edu`, then sign up / log in via the
header user menu.

## TLS options

**Default — provided wildcard cert.** The whole point of the wildcard: one
`*.vistacompute1.ucmerced.edu` cert covers every subdomain. Put `vistacompute1.crt`
+ `vistacompute1.key` in `deploy/certs/`; Traefik serves them by SNI
(`deploy/traefik/dynamic.yml` → `tls.certificates`). No renewal automation — swap
the files and `docker compose restart traefik` when the cert rotates.

**Alternative — Let's Encrypt HTTP-01** (auto-renewing, but **single host only**,
no wildcard). Use this if you'd rather auto-issue a cert for one specific name and
that name is publicly reachable on port 80:

1. In `docker-compose.yml`, uncomment the four `certificatesresolvers.letsencrypt`
   flags in the traefik `command`, the `traefik_letsencrypt` volume mount, and its
   `volumes:` declaration; set `ACME_EMAIL` (env or `deploy/.env`).
2. Change the **web** and **pb** router rules from `HostRegexp(...)` to
   `Host(`water3d.vistacompute1.ucmerced.edu`)` and add
   `traefik.http.routers.<web|pb>.tls.certresolver=letsencrypt` labels.
3. Remove/ignore the `deploy/certs` mount.

**Alternative — Let's Encrypt DNS-01** (auto-renewing *and* wildcard) is possible
if UC Merced's DNS has a Traefik-supported provider + API credentials; not wired
here since the provider is site-specific.

## The dashboards (loopback only)

Neither admin UI is exposed on the public domain — both bind to the host's
loopback. Reach them over SSH:

```bash
ssh -L 8080:localhost:8080 -L 8090:localhost:8090 <server>
# Traefik routing overview → http://localhost:8080/dashboard/
# PocketBase admin         → http://localhost:8090/_/
```

Day-to-day you rarely need PocketBase's: the superuser is created via the CLI
(step 4) and regular users self-register through the app's **Sign up** form.

## Updating

- **Frontend change** → rebuild the web image (the bundle is baked in):
  `docker compose up -d --build web`
- **Routing / proxy / TLS change** (`traefik/dynamic.yml`) → mounted and
  watched, so it hot-reloads with no restart. Changes to `traefik.yml` or the
  compose `command`/labels need `docker compose up -d`.
- **PocketBase migrations** → mounted read-only from `../pocketbase/pb_migrations`
  and applied on the next `docker compose restart pocketbase`.

## Production checklist

- [ ] `frontend/.env.production` created with the **public** `https://<host>/pb`
      URL (not `127.0.0.1`, no `pb.` subdomain).
- [ ] Mapbox token **URL-restricted** in the Mapbox dashboard (it's public in the bundle).
- [ ] **Pin** the PocketBase image tag in `docker-compose.yml`
      (currently `ghcr.io/muchobien/pocketbase:latest`) and the Traefik tag
      (currently `traefik:v3.3`).
- [ ] Strong PocketBase admin password (not the placeholder).
- [ ] In the PocketBase admin → Settings, set the **Application URL** to
      `https://<host>/pb` (used in verification/reset email links).
- [ ] Back up the **`pb_data`** volume on a schedule
      (`docker run --rm -v water3d_pb_data:/data -v "$PWD":/backup alpine tar czf /backup/pb_data.tgz -C /data .`).
- [ ] Confirm the Traefik dashboard shows the `web`, `pb`, and five weather
      routers all green.
- [ ] (Optional) Auth hardening in PocketBase: email verification, password reset,
      login rate limits.

## Notes / known constraints

- **Weather APIs must stay on the `/api/*` proxy paths.** The app calls relative
  paths that Traefik maps to the upstream hosts (`stripPrefix` strips the
  prefix, `passHostHeader: false` rewrites Host — exactly like the Vite dev
  proxy). Pointing the `VITE_*_PROXY_BASE_URL` vars at the upstreams directly
  will hit CORS.
- **PocketBase is browser-facing** at `https://<host>/pb`. The SDK runs
  client-side, so `VITE_POCKETBASE_URL` must be that public https path — an
  `http://` or `127.0.0.1` value fails (mixed content / wrong host) for real visitors.
- **`/api/*` is reserved for the weather proxies** (priority 100), which is why
  PocketBase lives at `/pb/*` (priority 50) and the SPA is the catch-all
  (priority 1) — PocketBase's own API is also under `/api/*` and would collide.
- **The web (nginx) and pocketbase containers are independent.** If PocketBase
  is down the SPA still loads and works on the localStorage base layer; fields
  just don't sync until it's back.
