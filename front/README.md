# MealPlanner MVP

Single-page React application for planning meals on a Raspberry Pi with a tiny FastAPI backend that persists dishes & day plans in MongoDB and generates shopping lists for any date range.

## Project layout

- `src/` – React + TypeScript frontend built with Vite, Tailwind CSS v4, and local API helpers.
- `public/` – static assets served as-is.
- `server/` – FastAPI application with MongoDB integration (Motor). Exposes REST endpoints for dishes, daily plans, and shopping list aggregation.
- `dist/` – generated production build (do not edit).

## Getting started

### Backend

1. From the `server/` directory install dependencies (preferably in a virtualenv):
   ```bash
   cd ../server
   pip install -r requirements.txt
   ```
2. Provide MongoDB connection details (defaults assume `mongodb://localhost:27017/mealplanner`):
   ```bash
   export MONGODB_URI="mongodb://localhost:27017"
   export MONGODB_DB="mealplanner"
   ```
3. Start the API (still inside `server/`):
   ```bash
   uvicorn app.main:app --reload --port 8000
   ```

The backend exposes:

- `GET /api/dishes` – list dishes
- `POST /api/dishes` – create
- `PUT /api/dishes/{id}` / `DELETE /api/dishes/{id}`
- `GET /api/plans?start&end` – daily plans (optional range)
- `PUT /api/plans/{dateISO}` / `DELETE /api/plans/{dateISO}`
- `GET /api/shopping-list?start&end` – aggregated ingredients for the interval

### Frontend

1. Install Node dependencies:
   ```bash
   npm install
   ```
2. Point the UI to the API (optional if using defaults):
   ```bash
   echo 'VITE_API_URL="http://localhost:8000/api"' > .env.local
   ```
3. Start the dev server:
   ```bash
   npm run dev
   ```

The app will load dishes and plans from MongoDB, update them through the FastAPI routes, and build shopping lists via the `/shopping-list` endpoint. Build for production with `npm run build` and preview via `npm run preview`.

### Docker (optional)

Run the entire stack (frontend + API + MongoDB) with Docker Compose:

```bash
cd ../docker
docker compose up --build
```

- Frontend served on http://localhost:5173
- API available on http://localhost:8000
- MongoDB exposed on `mongodb://localhost:27017`

Adjust the baked-in API URL for the frontend build by passing `--build-arg VITE_API_URL=...` to the compose or individual build command.
