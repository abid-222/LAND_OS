# 🇧🇩 Bangladesh LandOS

> **Epistemic-First Intelligent Land Administration & Verification Operating System for Bangladesh**  
> *Bengali OCR Normalization • Explainable Record Matching • Cadastral GIS Mapping • Conflict & Risk Engine • Epistemic Provenance Auditing*

---

## ⚡ Quickstart (Setup in 5 Commands)

Get Bangladesh LandOS running locally with full database, Redis queues, MinIO storage, ML models, and web interface in **5 commands**:

```bash
# 1. Clone the repository and enter directory
git clone https://github.com/abid-222/LAND_OS.git && cd LAND_OS

# 2. Copy environment configuration
cp .env.example .env

# 3. Spin up full stack (PostgreSQL, PostGIS, Redis, MinIO, Backend, Frontend)
docker compose up -d

# 4. Seed database (8 demo roles, 40 mouzas, 5,000+ land records, 12 KB articles)
docker compose exec api python app/modules/documents/seed.py

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
| `DATABASE_URL` | `postgresql+asyncpg://landos_user:landos_dev_password@localhost:5432/landos_db` | Main relational database with PostGIS & pgvector |
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

## 🏆 Hackathon Tracks & Core Capabilities (P1 – P6)

1. **P1: Bengali OCR & Document Digitization**:
   - On-device camera quality verification (blur, glare, resolution) with guidance.
   - Bengali numeral normalization (বাংলা অঙ্ক '০-৯' to canonical numbers).
   - Strict epistemic tagging: `OCR_EXTRACTED` vs `USER_CORRECTED` vs `VERIFIED_AUTHORIZED_SOURCE`.
2. **P2: Cryptographic QR & Digital Deed Verification**:
   - SHA-256 seal extraction and cross-verification against official sub-registry books.
   - Immediate detection of physical alterations (`TAMPER_DETECTED` vs `QR_VERIFIED`).
3. **P3: Forgery, Double-Sale & Conflict Engine (Rules R1 – R6)**:
   - `OVER_TRANSACTION_AREA` (R1): Detects concurrent double-sales (demonstrated on parcel `P-4520`).
   - `DUPLICATE_ACTIVE_DEED` (R2) & `CHRONOLOGICAL_ANOMALY` (R3): Temporal logic violations.
   - `UNRESOLVED_DISPUTE_MUTATION` (R4), `SATELLITE_BOUNDARY_OVERLAP` (R5), `CHAIN_OF_TITLE_DISCONTINUITY` (R6).
4. **P5: Citizen Pre-Purchase Due Diligence**:
   - 6 neutral traffic lights: ownership, double sales, khas land (R7), acquisition (R8), litigation (R9), khatian sync.
   - Evaluates test parcels: `P-CLEAN-01` (fully verified), `P-KHAS-01` (govt khas land), `P-LIT-01` (court injunction).
   - Browser-native print stylesheet with strict non-legal advice disclaimers.
5. **P4: Smart E-Namjari Workflow & Tracking**:
   - 6-stage finite state machine (`submitted` -> `auto_verification` -> `documents_review` -> `hearing_scheduled` -> `khatian_updated` / `rejected`).
   - Automated 4-point AI pre-verification checklist.
   - Role-segregated workflow (Tech Admin strictly forbidden from approvals).
   - Public tracking code lookup (`NJ-2026-1001`) with live milestone stepper.
6. **P6: Parcel Guardian Watch & Bengali Voice Assistant**:
   - Natural spoken Bengali voice input ("জমি কেনার আগে P-4520 যাচাই") via Web Speech API.
   - Client-side spoken Bengali numeral normalization ("চার পাঁচ দুই শূন্য" -> "4520").
   - Parcel watch subscriptions (`/api/v1/parcels/{id}/watch`) with simulated SMS Outbox.
   - Offline-first document capture with client-side AES-GCM encryption and IndexedDB sync.

---

## 🧪 Testing, Quality & Security Gates

```bash
# Backend unit & integration test suite (358 tests - 100% pass)
pytest backend/tests

# RBAC permission matrix (138 checks across 8 roles)
pytest backend/tests/test_rbac_matrix.py

# Route protection audit (asserts zero unauthenticated endpoints)
pytest backend/tests/test_route_protection.py

# Frontend test suite (Vitest - 11/11 tests pass)
cd frontend && npm test

# Playwright E2E suites (Smoke, Roles, Namjari, Offline)
npx playwright test e2e/smoke.spec.ts
npx playwright test e2e/roles.spec.ts
npx playwright test e2e/namjari.spec.ts
npx playwright test e2e/offline.spec.ts
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
