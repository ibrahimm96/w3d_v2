# PocketBase — Water 3D backend

PocketBase provides user accounts (login/signup) and owner-scoped field storage

for the Water 3D frontend. It runs in Docker via [`docker-compose.yml`](./docker-compose.yml),
applies the migrations in [`pb_migrations/`](./pb_migrations) on startup, and
serves the REST API + admin UI on **http://127.0.0.1:8090**.

The frontend talks to it through `frontend/.env`
(`VITE_POCKETBASE_ENABLED=true`, `VITE_POCKETBASE_URL=http://127.0.0.1:8090`).
Until a user logs in, the app stays on localStorage; logging in switches field
storage to PocketBase. localStorage is always the base layer, so the app works
with or without the server running.

## Prerequisites

- Docker with the Compose plugin (`docker compose version`)

## Quick start

```bash
cd pocketbase

# 1. Start PocketBase (migrations apply automatically on first boot)
docker compose up -d

# 2. Create the admin / superuser (first run only)
docker compose exec pocketbase /usr/local/bin/pocketbase superuser create admin@example.com "change-me-please"

# 3. (Re)start the frontend so it picks up the build-time env vars
cd ../frontend && npm run dev
```

Then open the app, click the user icon in the header, and **Sign up** or **Log in**.
Manage data directly at the admin UI: http://127.0.0.1:8090/_/

## What gets created

On first boot the migrations create these collections:

| Collection     | Purpose                                                        |
| -------------- | ------------------------------------------------------------- |
| `users`        | Built-in PocketBase auth collection (login/signup target)     |
| `fields`       | User fields, owner-scoped (`owner = @request.auth.id`)        |
| `crop_types`   | Crop profiles (seeded: almond, tomato, wineGrape, alfalfa)    |
| `soil_types`   | Soil profiles                                                 |
| `openet_cache` | Server-side cache for OpenET responses                        |

Data persists in the named `pb_data` Docker volume across restarts.

## Common commands

```bash
docker compose up -d          # start in the background
docker compose logs -f        # follow logs (watch migrations apply)
docker compose ps             # status + health
docker compose down           # stop (keeps the pb_data volume)
docker compose down -v        # stop AND delete all data (fresh slate)
docker compose pull           # update the PocketBase image
```

Create another user from the CLI instead of the signup form:

```bash
docker compose exec pocketbase /usr/local/bin/pocketbase superuser create you@example.com "password"
# (regular app users are created via the "Sign up" form or the admin UI)
```

## Configuration

### Pin the PocketBase version

`docker-compose.yml` uses `ghcr.io/muchobien/pocketbase:latest`. For reproducible
builds, pin a specific tag (any release **>= 0.23** supports these JSVM migrations):

```yaml
    image: ghcr.io/muchobien/pocketbase:0.28.4
```

### Change the port

Edit the `ports` mapping (`8090:8090`) and update `VITE_POCKETBASE_URL` in
`frontend/.env` to match. Env is **build-time** — restart `vite` after changing it.

### Frontend env vars (`frontend/.env`)

| Var                                 | Value                     |
| ----------------------------------- | ------------------------- |
| `VITE_POCKETBASE_ENABLED`           | `true`                    |
| `VITE_POCKETBASE_URL`               | `http://127.0.0.1:8090`   |
| `VITE_POCKETBASE_FIELDS_COLLECTION` | `fields` (default)        |

## Troubleshooting

- **App still says "PocketBase is disabled"** — the env vars didn't load. Confirm
  `frontend/.env` has `VITE_POCKETBASE_ENABLED=true` and **restart `vite`** (env
  is read at build time, not hot-reloaded).
- **Login/fetch errors / "Failed to fetch"** — the container isn't up or the URL
  is wrong. Check `docker compose ps` and that `VITE_POCKETBASE_URL` matches the
  published port.
- **Signup returns 403** — the `users` collection's create rule is locked down.
  Open the admin UI → `users` → API Rules and allow create (empty rule = public).
- **Migrations didn't run / collections missing** — check `docker compose logs`.
  A fresh PocketBase ships the `users` collection that the `fields.owner` relation
  links to; if you see a "users not found" error, create a `users` auth collection
  first, then restart.
- **Start completely fresh** — `docker compose down -v` deletes the `pb_data`
  volume, then `docker compose up -d` re-applies migrations from scratch.
