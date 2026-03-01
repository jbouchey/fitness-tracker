# TrailTracker — Personal Fitness Tracker

A full-stack web app for tracking trail runs and fitness workouts. Supports FIT (Garmin) and GPX file uploads with automatic metric extraction, GPS route maps, elevation profiles, and heart rate charts.

## Tech Stack

- **Frontend**: React 18 + Vite, Tailwind CSS, Zustand, Mapbox GL JS, Recharts
- **Backend**: Node.js + Express
- **Database**: PostgreSQL + Prisma ORM
- **Auth**: JWT

---

## Prerequisites

Install these before starting:

1. **Node.js 20+** — https://nodejs.org
2. **PostgreSQL 15+** — https://www.postgresql.org/download/windows/
   - During install, set a password for the `postgres` user (you'll need it)
3. **Mapbox account** (free) — https://account.mapbox.com/auth/signup/
   - After creating an account, copy your **Default public token** from the Tokens page

---

## Setup

### 1. Install dependencies

Open a terminal in the `fitness-tracker/` folder and run:

```bash
npm install
cd server && npm install
cd ../client && npm install
```

### 2. Create the database

Open **pgAdmin** (installed with PostgreSQL) or a terminal and run:

```sql
CREATE DATABASE fitness_tracker;
```

Or via terminal if PostgreSQL is in your PATH:
```bash
createdb -U postgres fitness_tracker
```

### 3. Configure environment variables

**Server:**
```bash
cd server
cp .env.example .env
```
Edit `server/.env` and fill in:
- `DATABASE_URL` — use your postgres password, e.g. `postgresql://postgres:yourpassword@localhost:5432/fitness_tracker`
- `JWT_SECRET` — any long random string (e.g. run `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`)

**Client:**
```bash
cd client
cp .env.example .env
```
Edit `client/.env` and fill in:
- `VITE_MAPBOX_TOKEN` — your Mapbox public token (starts with `pk.`)

### 4. Run database migrations

```bash
cd server
npx prisma migrate dev --name init
```

This creates all the database tables.

### 5. Start the app

From the `fitness-tracker/` root:

```bash
npm run dev
```

This starts both the server (port 3001) and client (port 5173) simultaneously.

Open **http://localhost:5173** in your browser.

---

## Usage

1. **Register** an account at `/register`
2. **Upload** a `.fit` or `.gpx` file at `/upload`
   - FIT files come from Garmin watches (found in `GARMIN/Activity/` on the device)
   - GPX files can be exported from Strava, Garmin Connect, or most GPS devices
3. **View** your workout detail with route map, metrics, charts, and mile splits
4. **Browse** your workout history on the dashboard with search and filters

---

## Project Structure

```
fitness-tracker/
├── client/          # React frontend (Vite)
│   └── src/
│       ├── api/         # Axios API calls
│       ├── store/       # Zustand state (auth, workouts)
│       ├── pages/       # Route-level page components
│       ├── components/  # UI components
│       └── utils/       # Formatters, constants
├── server/          # Express backend
│   ├── prisma/      # Database schema + migrations
│   └── src/
│       ├── config/      # Env vars, Prisma client
│       ├── controllers/ # Route handlers
│       ├── middleware/  # Auth, upload, error handling
│       ├── routes/      # Express routers
│       ├── services/    # Business logic, file parsing
│       └── utils/       # JWT, geo, metrics calculator
└── package.json     # Workspace root
```

---

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start both server and client |
| `npm run dev:server` | Start server only |
| `npm run dev:client` | Start client only |
| `npm run build` | Build client for production |
| `cd server && npx prisma studio` | Open database GUI |
| `cd server && npx prisma migrate dev` | Run new migrations |
