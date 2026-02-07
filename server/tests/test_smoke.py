import pytest
from httpx import ASGITransport, AsyncClient

import app.main as main


@pytest.fixture
def app_no_migrations(monkeypatch: pytest.MonkeyPatch):
  async def noop(_: object) -> None:
    return None

  monkeypatch.setattr(main, "get_database", lambda: None)
  monkeypatch.setattr(main, "run_migrations", noop)
  return main.app


@pytest.mark.anyio
async def test_health(app_no_migrations) -> None:
  transport = ASGITransport(app=app_no_migrations)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    response = await client.get("/api/health")
  assert response.status_code == 200
  assert response.json() == {"status": "ok"}


@pytest.mark.anyio
async def test_openapi(app_no_migrations) -> None:
  transport = ASGITransport(app=app_no_migrations)
  async with AsyncClient(transport=transport, base_url="http://test") as client:
    response = await client.get("/openapi.json")
  assert response.status_code == 200
  payload = response.json()
  assert payload["info"]["title"] == "MealPlanner API"
