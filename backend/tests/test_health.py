import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.main import app


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session
    await engine.dispose()


@pytest.fixture
async def client(test_session: AsyncSession):
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_health_endpoints(client: AsyncClient):
    # 1. Liveness probe
    live_res = await client.get("/api/v1/health/liveness")
    assert live_res.status_code == 200
    assert live_res.json()["status"] == "alive"

    # 2. Readiness probe
    readiness_res = await client.get("/api/v1/health/readiness")
    assert readiness_res.status_code == 200
    assert "status" in readiness_res.json()

    # 3. Aggregated health
    health_res = await client.get("/api/v1/health")
    assert health_res.status_code == 200
    data = health_res.json()
    assert data["service"] == "Bangladesh LandOS"
    assert "checks" in data
