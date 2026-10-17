# 🇧🇩 Bangladesh LandOS

> **Epistemic-First Intelligent Land Administration & Verification Operating System for Bangladesh**  
> *Bengali OCR Normalization • Explainable Record Matching • Cadastral GIS Mapping • Conflict & Risk Engine • Epistemic Provenance Auditing*

---

## ⚡ Quickstart (Setup in 5 Commands)

Get Bangladesh LandOS running locally with full database, Redis queues, MinIO storage, ML models, and web interface in **5 commands**:

```bash
# 1. Clone the repository and enter directory
git clone https://github.com/bangladesh-landos/landos.git && cd landos

# 2. Copy environment configuration
cp .env.example .env

# 3. Spin up full stack (PostgreSQL, PostGIS, Redis, MinIO, Backend, Frontend)
docker compose up -d

# 4. Seed database (8 demo roles, 40 mouzas, 5,000+ land records, 12 KB articles)
docker compose exec backend python app/modules/documents/seed.py

# 5. Access the Web Application
# Open in browser: http://localhost:5173
```

---

## 🔑 Demo Accounts (Development & Evaluation)

All demo accounts are pre-seeded in dev mode with passwords loaded from environment (`DEMO_PASSWORD`, default: `Password123!`):

| Role | Email | Password | Scope & Primary Workflow | MFA (TOTP) |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@landos.gov.bd` | `DEMO_PASSWORD` | Public: Deed Scan-to-Search, Citizen Guide | Optional |
| **Operator** | `operator@landos.gov.bd` | `DEMO_PASSWORD` | Union Land Office: Document intake & corrections | Optional |
| **Reviewer** | `reviewer@landos.gov.bd` | `DEMO_PASSWORD` | AC Land Office: HITL Review Queue resolution | Optional |
| **Supervisor** | `supervisor@landos.gov.bd` | `DEMO_PASSWORD` | Circle AC Land: Conflict reviews & approvals | Optional |
| **Office Admin** | `officeadmin@landos.gov.bd` | `DEMO_PASSWORD` | Upazila Office: User management & office config | Optional |
| **Regional Manager**| `regionalmanager@landos.gov.bd`| `DEMO_PASSWORD` | Division/District: Cross-office performance metrics | Optional |
| **Security Officer**| `securityofficer@landos.gov.bd`| `DEMO_PASSWORD` | National: Immutable SHA-256 audit log inspection | **Enforced** |
| **Tech Admin** | `techadmin@landos.gov.bd` | `DEMO_PASSWORD` | System: Accuracy & Reliability Lab, Quality Gates | **Enforced** |

> *MFA Secret for Tech Admin and Security Officer is configured via `DEMO_MFA_SECRET` (default: `JBSWY3DPEHPK3PXP`).*

---

## ⚙️ Environment Variables

Key runtime environment variables configured in `.env` (derived from `.env.example`):

| Variable | Default Value | Description |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+asyncpg://landos:landos@localhost:5432/landos` | Main relational database with PostGIS & pgvector |
| `REDIS_URL` | `redis://localhost:6379/0` | Async background job queue and SSE progress broker |
| `MINIO_ENDPOINT` | `localhost:9000` | S3-compatible object storage for document scans |
| `MINIO_BUCKET` | `landos-documents` | Private bucket for ingested document images |
| `MAP_TILE_URL` | `https://tile.openstreetmap.org/{z}/{x}/{y}.png` | Cadastral basemap tile provider endpoint |
| `DEMO_PASSWORD` | `Password123!` | Standard password for seeded demo accounts |
| `DEMO_MFA_SECRET` | `JBSWY3DPEHPK3PXP` | Standard base32 secret for TOTP-enforced roles |
| `JWT_SECRET_KEY` | *(random 32 bytes)* | Cryptographic HMAC key for session tokens |
| `MAX_UPLOAD_SIZE_MB` | `15` | Upper limit for multipart document uploads |

---

## 🩺 System Diagnostics, Smoke Journey & Evaluation

```bash
# Fast connectivity doctor across all 10 architectural components
make doctor
# or: python scripts/doctor.py

# Full end-to-end scripted smoke test journey (8 roles, upload, OCR, search, verify, risk, report, audit)
make smoke
# or: python scripts/smoke_test.py

# Evaluate ML stack metrics, CER/FEA, confusion matrices, and release gates
make eval
# or: python ml/src/evaluate.py

# Train or calibrate machine learning models (Bengali OCR & Match Scorer)
make train
# or: python ml/src/train.py

# Reset database, storage, and models back to clean baseline demo seed state
make demo-reset
# or: python scripts/demo_reset.py
```

---

## 🏛️ System Architecture & Key Capabilities

1. **Smart Scan-to-Search**:
   - Primary cryptographic QR payload decoding; graceful fallback to Bengali OCR.
   - Bengali numeral normalization (বাংলা অঙ্ক '০-৯' to English '0-9' and canonical forms).
   - Strict epistemic tagging: `OCR_EXTRACTED` vs `VERIFIED_AUTHORIZED_SOURCE`.
2. **Explainable Multi-Identifier Record Matching**:
   - Machine-learned candidate ranker (`RandomForestClassifier`) trained on synthesized ground truth.
   - Transparent itemized feature contribution scoring (no black-box predictions).
   - Ambiguity detection (flags when top 2 candidate scores are within 0.10).
3. **Interactive Cadastral GIS Map**:
   - Vector polygons rendered with MapLibre GL.
   - Clear epistemic indicator: `is_illustrative: true` to prevent misinterpretation as legal boundaries.
4. **Risk & Conflict Engine (6 Deterministic Rules)**:
   - `OVER_TRANSACTION_AREA`: Sold area exceeds registered entitlement.
   - `DUPLICATE_ACTIVE_DEED`: Conflicting concurrent deeds on identical parcel.
   - `UNRESOLVED_DISPUTE_MUTATION`: Pending civil court or AC Land dispute flag.
   - `SATELLITE_BOUNDARY_OVERLAP`: Cadastral survey overlap.
   - `VESTED_GOVT_LAND_INTERSECTION`: Khas, railway, or waqf property clash.
   - `CHAIN_OF_TITLE_DISCONTINUITY`: Unbroken deed transfer chain verification.
5. **Buyer Due Diligence Report**:
   - 5 structured sections with neutral, non-speculative language (zero "safe/unsafe" ratings).
   - Actionable checklist citing authoritative Ministry of Land circulars.
6. **Accuracy & Reliability Lab**:
   - Real-time Character Error Rate (CER), Field Extraction Accuracy (FEA) per field, silent error rate, flag recall, and Bengali digit confusion matrix.
   - Enforced quality gates with automatic rejection of subpar extractions.

---

## 🧪 Testing, Quality & Security Gates

```bash
# Backend unit & integration test suite (316 tests)
pytest backend/tests

# RBAC permission matrix (138 checks across 8 roles)
pytest backend/tests/test_rbac_matrix.py

# Security audit (Bandit static analysis & pip-audit)
bandit -r backend/app
pip-audit

# Frontend test suite
cd frontend && npm test

# Run empirical load test simulation and query plan analysis
python scripts/run_benchmarks.py

# Disaster recovery backup & restore verification
python scripts/nightly_backup.py
python scripts/test_restore.py
```

---

## 📚 Documentation Index

- [docs/API.md](docs/API.md) — Comprehensive OpenAPI REST documentation.
- [docs/LIMITATIONS.md](docs/LIMITATIONS.md) — Synthetic data notice, no live government server integration, and legal disclaimers.
- [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) — Step-by-step 5-minute executive walkthrough demo script.
- [docs/PERFORMANCE.md](docs/PERFORMANCE.md) — k6 load benchmark percentiles (p50/p95/p99) and SQL `EXPLAIN ANALYZE` query plans.
- [docs/BACKUP_AND_RESTORE.md](docs/BACKUP_AND_RESTORE.md) — Nightly backup architecture and disaster recovery test runbook.
- [eval/zap_baseline_report.md](eval/zap_baseline_report.md) — OWASP ZAP Baseline DAST security report.

---

## 🚀 Cloud Deployment (Render & Vercel)

### 1. Backend Deployment on Render
1. Connect your GitHub repository (`abid-222/LAND_OS`) to [Render](https://render.com).
2. Create a **New Web Service** (or use Blueprint with `render.yaml`):
   - **Root Directory**: `backend` (or leave empty if using Blueprint)
   - **Build Command**: `pip install -r backend/requirements.txt`
   - **Start Command**: `cd backend && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Environment Variables**:
     - `ENVIRONMENT` = `production`
     - `DEBUG` = `false`
     - `SECRET_KEY` = `(generate strong secret)`
     - `DATABASE_URL` = `(your PostgreSQL connection string)`
     - `BACKEND_CORS_ORIGINS` = `https://your-frontend.vercel.app`

### 2. Frontend Deployment on Vercel
1. Import your GitHub repository (`abid-222/LAND_OS`) in [Vercel](https://vercel.com).
2. Configure Project Settings:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `frontend` (or project root with auto-included `vercel.json`)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL` = `https://your-backend.onrender.com` (your Render backend URL)
