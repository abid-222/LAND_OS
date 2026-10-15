"""
Unit Tests for Accuracy & Reliability Lab (Feature 4).
Verifies:
- GET /api/v1/quality/eval-runs reads eval_runs/
- Shows CER and FEA SEPARATELY per field (dag_no, khatian_no, mouza)
- Shows critical-field FEA, silent error rate, flag recall, digit confusion matrix
- Quality gate enforcement (e.g. dag_no FEA >= 0.95 threshold)
- POST /api/v1/quality/run-eval triggers evaluation run
"""

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac


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
