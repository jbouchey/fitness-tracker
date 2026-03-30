# Home Server Setup Guide

Self-hosting TrailTracker with Docker Compose, replacing Railway.

## Prerequisites

Install on your home server:
- [Docker Engine](https://docs.docker.com/engine/install/) (v24+)
- Docker Compose plugin (included with Docker Engine on Linux via `docker compose`)

Verify:
```bash
docker --version
docker compose version
```

---

## 1. Clone the repo on your home server

```bash
git clone https://github.com/jbouchey/fitness-tracker.git fitness-tracker
cd fitness-tracker
```

---

## 2. Configure environment variables

Your real env values live in two files on your **dev machine** (never committed to git):
- `server/.env`
- `client/.env`

Open both files on your dev machine and keep them handy — you'll copy values from them below.

On the **home server**, after cloning:

```bash
cp .env.home-server .env
nano .env
```

Fill in each value:

| Variable | Where to get it |
|---|---|
| `POSTGRES_PASSWORD` | Make up any strong password — this is only used between containers, not exposed externally |
| `JWT_SECRET` | Copy `JWT_SECRET` from your `server/.env` |
| `JWT_EXPIRES_IN` | `7d` (leave as-is) |
| `CLIENT_URL` | Your home server's LAN IP, e.g. `http://192.168.0.236` (see note below) |
| `APP_URL` | Same as `CLIENT_URL` |
| `RESEND_API_KEY` | Copy from `server/.env` if present |
| `STRAVA_CLIENT_ID` | Copy from `server/.env` if present |
| `STRAVA_CLIENT_SECRET` | Copy from `server/.env` if present |
| `STRAVA_WEBHOOK_VERIFY_TOKEN` | Copy from `server/.env` if present |
| `VITE_API_URL` | `http://192.168.0.236/api` — same IP as above, Nginx handles the `/api` routing |
| `VITE_MAPBOX_TOKEN` | Copy `VITE_MAPBOX_TOKEN` from your `client/.env` |

> **Finding your home server's IP:** On the server, run `ip addr show` (Linux) or check your router's DHCP table. It'll be something like `192.168.0.x`. Use that IP for `CLIENT_URL`, `APP_URL`, and `VITE_API_URL`.

> **Tip:** Assign your home server a static LAN IP in your router settings so it doesn't change after a reboot.

---

## 3. Migrate your Railway PostgreSQL database

### 3a. Export from Railway

In the Railway dashboard, open your PostgreSQL service → **Data** → **Export**.
Or use `pg_dump` with the Railway connection string (find it under Variables):

```bash
pg_dump "postgresql://USER:PASSWORD@containers-us-west-xxx.railway.app:PORT/railway" \
  --no-owner --no-acl -F c -f railway_backup.dump
```

### 3b. Import into the new container

Start only the database container first:

```bash
docker compose up -d postgres
```

Wait a few seconds for it to initialize, then restore:

```bash
# Copy the dump into the container
docker compose cp railway_backup.dump postgres:/tmp/backup.dump

# Restore
docker compose exec postgres pg_restore \
  -U trailtracker -d fitness_tracker \
  --no-owner --no-acl /tmp/backup.dump
```

If you exported as plain SQL (`.sql`) instead of custom format:
```bash
docker compose exec -T postgres psql -U trailtracker fitness_tracker < railway_backup.sql
```

---

## 4. Build and start everything

```bash
docker compose up --build -d
```

This will:
1. Build the server image (installs deps, generates Prisma client)
2. Build the client image (runs `vite build`, copies dist into Nginx)
3. Start postgres → server → client (in dependency order)
4. Run `prisma migrate deploy` before the server starts

Check logs:
```bash
docker compose logs -f
```

The app will be available at `http://YOUR_HOME_SERVER_IP`.

---

## 5. Update the Strava webhook URL

Strava webhooks call back to your server's `/api/strava/webhook` endpoint. Since your URL changed from Railway to your home server, you need to re-register it.

### Delete the old subscription

First, find your existing subscription ID:
```bash
curl "https://www.strava.com/api/v3/push_subscriptions?client_id=YOUR_CLIENT_ID&client_secret=YOUR_CLIENT_SECRET"
```

Delete it:
```bash
curl -X DELETE "https://www.strava.com/api/v3/push_subscriptions/SUBSCRIPTION_ID" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET"
```

### Create the new subscription

Your server must be reachable from the internet for Strava webhooks to work. Options:
- **Port forward** port 80 on your router to the home server
- **Use a tunnel** like [Cloudflare Tunnel](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/) (free, no port forwarding needed)

Once your server is reachable at a public URL (e.g. `https://trailtracker.yourdomain.com`):

```bash
curl -X POST "https://www.strava.com/api/v3/push_subscriptions" \
  -d "client_id=YOUR_CLIENT_ID" \
  -d "client_secret=YOUR_CLIENT_SECRET" \
  -d "callback_url=https://trailtracker.yourdomain.com/api/strava/webhook" \
  -d "verify_token=YOUR_STRAVA_WEBHOOK_VERIFY_TOKEN"
```

> If you only use Strava via manual OAuth (not push webhooks), skip this section.

---

## 6. Email (Resend)

No changes needed to your Resend account or API key. Just make sure `CLIENT_URL` and `APP_URL` in `.env` point to your new home server address — these are embedded in verification/reset emails.

---

## Useful commands

```bash
# View running containers
docker compose ps

# Tail logs for a specific service
docker compose logs -f server
docker compose logs -f client

# Restart a single service
docker compose restart server

# Stop everything
docker compose down

# Stop and wipe the database volume (destructive!)
docker compose down -v

# Run a Prisma migration after a schema change
docker compose exec server npx prisma migrate deploy

# Open a psql shell
docker compose exec postgres psql -U trailtracker fitness_tracker
```

---

## Updating the app

```bash
git pull
docker compose up --build -d
```

Docker Compose will rebuild only the changed images and restart affected containers.
