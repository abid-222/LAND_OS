"""
Unit Tests for Accuracy & Reliability Lab (Feature 4).
Verifies:
- GET /api/v1/quality/eval-runs reads eval_runs/
- Shows CER and FEA SEPARATELY per field (dag_no, khatian_no, mouza)
- Shows critical-field FEA, silent error rate, flag recall, digit confusion matrix
- Quality gate enforcement (e.g. dag_no FEA >= 0.95 threshold)
- POST /api/v1/quality/run-eval triggers evaluation run
"""

import uuid
from typing import cast

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base, get_db
from app.core.security import create_access_token, hash_password
from app.main import app
from app.models import User


@pytest.fixture
async def client():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=[cast(Table, User.__table__)])

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        admin_user = User(
            id=uuid.uuid4(),
            email="techadmin@landos.gov.bd",
            hashed_password=hash_password("Password123!"),
            role="Tech Admin",
            mfa_enabled=False,
        )
        session.add(admin_user)
        await session.commit()

        async def override_get_db():
            yield session

        app.dependency_overrides[get_db] = override_get_db

        admin_token = create_access_token(str(admin_user.id), admin_user.role, admin_user.email)
        csrf_token = "test_csrf_token_quality_lab"
        transport = ASGITransport(app=app)
        async with AsyncClient(
            transport=transport,
            base_url="http://testserver",
            cookies={
                "landos_access_token": admin_token,
                "landos_csrf_token": csrf_token,
            },
            headers={"X-CSRF-Token": csrf_token},
        ) as ac:
            yield ac

        app.dependency_overrides.clear()
    await engine.dispose()


@pytest.mark.asyncio
async def test_quality_lab_eval_runs_per_field_metrics(client: AsyncClient):
    """
    Dashboard reads eval_runs; shows CER and FEA SEPARATELY per field (dag_no, khatian_no, mouza),
    critical-field FEA, silent error rate, flag recall, digit confusion matrix.
    """
    res = await client.get("/api/v1/quality/eval-runs")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["total_runs"] >= 1
    latest = data["latest_run"]

    # 1. Separately per field metrics
    fields = latest["fields"]
    assert "dag_no" in fields
    assert "khatian_no" in fields
    assert "mouza" in fields

    # dag_no has both FEA and CER separately
    dag = fields["dag_no"]
    assert "fea" in dag and isinstance(dag["fea"], float)
    assert "cer" in dag and isinstance(dag["cer"], float)
    assert dag["fea"] >= 0.95

    # khatian_no has both FEA and CER separately
    khatian = fields["khatian_no"]
    assert "fea" in khatian and isinstance(khatian["fea"], float)
    assert "cer" in khatian and isinstance(khatian["cer"], float)
    assert khatian["fea"] >= 0.95

    # mouza has both FEA and CER separately
    mouza = fields["mouza"]
    assert "fea" in mouza and isinstance(mouza["fea"], float)
    assert "cer" in mouza and isinstance(mouza["cer"], float)

    # 2. Critical field metrics
    assert latest["critical_field_fea"] >= 0.90
    assert latest["silent_error_rate"] <= 0.05
    assert latest["flag_recall"] >= 0.90

    # 3. Digit confusion matrix
    confusion = latest["digit_confusion"]
    assert isinstance(confusion, dict)
    assert len(confusion) >= 1
    # Check sample confusion keys
    assert any("->" in k for k in confusion.keys())

    # 4. Gates evaluation
    gates = latest["gates"]
    assert len(gates) >= 3
    gate_names = [g["gate_name"] for g in gates]
    assert any("Dag" in name or "দাগ" in name for name in gate_names)


@pytest.mark.asyncio
async def test_trigger_eval_run_endpoint(client: AsyncClient):
    """
    Tech Admin action to execute an evaluation benchmark run and record it.
    """
    res = await client.post("/api/v1/quality/run-eval")
    assert res.status_code == 200, res.text
    data = res.json()

    assert data["id"].startswith("eval_run_")
    assert "fields" in data
    assert "dag_no" in data["fields"]
    assert data["fields"]["dag_no"]["fea"] >= 0.95
    assert data["all_gates_passed"] is True
