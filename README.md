# Project Structure

```
/
├─ front/   → React + Vite frontend application
├─ server/  → Legacy FastAPI backend with MongoDB persistence
├─ server-java/ → Java 25 + Spring Boot backend (current)
└─ docker/  → Containerisation assets (docker-compose, nginx config, etc.)
```

- Frontend documentation and scripts live in `front/README.md`.
- Legacy FastAPI app resides under `server/app` with dependencies in `server/requirements.txt`.
- Use `docker/docker-compose.app-java.yml` (via `scripts/app-java-up.sh`) to launch the current stack (`frontend` + Java backend).
- Use `docker/docker-compose.app.yml` (via `scripts/app-up.sh`) to launch the same Java stack with env overrides.
- Use `docker/docker-compose.yml` for the default Java stack (`frontend` + Java backend).
  ```bash
  cd docker
  docker compose up --build
  ```

Consult `AGENTS.md` for contributor guidelines. Exposed services by default:
- Frontend: http://localhost:5173
- API: http://localhost:8000
- MongoDB: external (set `MONGODB_URI`)
