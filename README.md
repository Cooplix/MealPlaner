# MealPlaner

Meal planning and household food tracking app.

Current production backend is Java 25 + Spring Boot (`server-java/`).
Legacy FastAPI backend remains in `server/` for reference only.

## Current capabilities
- Auth and profile management (`/api/auth`, `/api/users`).
- Dishes and weekly calendar planning.
- Shopping list generation from planned dishes.
- Ingredients catalog and calorie presets.
- Purchase tracking, spending analytics, and dish cost breakdown.
- Inventory management (products + pet food).

## Repository layout
```text
/
├─ front/         React + TypeScript + Vite frontend
├─ server-java/   Java backend (Spring Boot + MongoDB)
├─ server/        Legacy FastAPI backend (not primary)
├─ docker/        Compose files and nginx config
├─ scripts/       Operational scripts (start/stop/migrations)
└─ docs/          Analysis and implementation plans
```

## Quick start (Docker, recommended)

From repository root:

```bash
bash scripts/app-java-up.sh
```

Stop stack:

```bash
bash scripts/app-java-down.sh
```

By default:
- Frontend (container): `http://localhost:5173`
- App base path: `http://localhost:5173/mealplanner/`
- Backend API: `http://localhost:8000/api`
- Health: `http://localhost:8000/api/health`

Ports are intentionally bound to `127.0.0.1`.

## Environment variables (backend)

Main variables used by compose:
- `MONGODB_URI` (default: `mongodb://host.docker.internal:27017/`)
- `MONGODB_DB` (default: `mealplanner`)
- `JWT_SECRET` (change in real deployments)
- `JWT_EXP_MINUTES` (default: `120`)
- `ADMIN_LOGIN` (default: `admin`)
- `ADMIN_INITIAL_PASSWORD` (change in real deployments)

`scripts/app-java-up.sh` and `scripts/app-up.sh` will use env files only if they exist:
- `docker/app-java.env`
- `docker/app.env`

## Reverse proxy / subpath deployment

Frontend is built with base path:
- `front/vite.config.ts`: `base: "/mealplanner/"`

Nginx config supports:
- `/mealplanner/` for frontend
- `/mealplanner/api/` proxy to backend API

Use `VITE_API_URL=/mealplanner/api` for subpath deployments.

## Local development

## Frontend
```bash
cd front
npm install
npm run dev
```

Other useful commands:
- `npm run build`
- `npm run lint`
- `npm run preview`

## Java backend
Requirements:
- Java 25
- Maven

Run locally:
```bash
cd server-java
mvn spring-boot:run
```

Run tests:
```bash
mvn -q test
```

Coverage gate (JaCoCo minimum 60%):
```bash
mvn -q verify
```

## Operational scripts
- `scripts/app-java-up.sh`: start current Docker stack (`docker-compose.app-java.yml`).
- `scripts/app-java-down.sh`: stop current Docker stack.
- `scripts/app-up.sh`: start app stack from `docker-compose.app.yml` (env-driven variant).
- `scripts/app-down.sh`: stop app stack from `docker-compose.app.yml`.
- `scripts/cutover-start.sh`: helper to start Java stack during cutover.
- `scripts/migrate-inventory-xlsx.py`: migrate inventory data from `inventory_system.xlsx` to MongoDB.
- `scripts/resolve-user-id.py`: resolve MongoDB `user_id` by login (for migration scripts).

## Key docs
- `AGENTS.md`: repository workflow and contribution rules.
- `docs/functions-unification-plan-2026-02-08.md`
- `docs/receipt-ocr-ai-plan-2026-02-08.md`
- `docs/weekly-dish-recommendations-plan-2026-02-08.md`
- `docs/ui-improvement-plan-2026-02-08.md`

## Notes
- `server/` is legacy and kept for reference; new work should target `server-java/`.
- Keep secrets (`JWT_SECRET`, admin password, Mongo URI) out of committed files in real environments.
