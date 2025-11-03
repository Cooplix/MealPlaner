# Project Structure

```
/
├─ front/   → React + Vite frontend application
├─ server/  → FastAPI backend with MongoDB persistence
└─ docker/  → Containerisation assets (docker-compose, nginx config, etc.)
```

- Frontend documentation and scripts live in `front/README.md`.
- Backend FastAPI app resides under `server/app` with dependencies in `server/requirements.txt`.
- Use `docker/docker-compose.yml` to launch the full stack (`frontend`, `backend`, `mongo`) locally:
  ```bash
  cd docker
  docker compose up --build
  ```

Consult `AGENTS.md` for contributor guidelines. Exposed services by default:
- Frontend: http://localhost:5173
- API: http://localhost:8000
- MongoDB: mongodb://localhost:27017
