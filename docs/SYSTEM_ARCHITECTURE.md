# Bangladesh LandOS — System Architecture

## 1. High-Level Architecture Overview

Bangladesh LandOS is engineered as a resilient, decoupled web-first platform designed to run in cloud or on-premise government datacenters (National Data Center / BCC).

```
                      +---------------------------------------+
                      |   Mobile & Desktop Browsers           |
                      |   (Vite + React 18 + TS + Tailwind)   |
                      |   PWA capabilities, zxing-wasm, dvh   |
                      +-------------------+-------------------+
                                          | HTTPS / REST / SSE
                                          v
                      +---------------------------------------+
                      |       Nginx Ingress Reverse Proxy     |
                      |   (Rate limiting, TLS, gzip/brotli)   |
                      +-------------------+-------------------+
                                          |
                      +-------------------+-------------------+
                      |   Backend API: FastAPI (Python 3.11)  |
                      |   - Argon2id Auth + httpOnly Cookies  |
                      |   - Deny-by-default RBAC Engine       |
                      |   - Structured JSON Logging           |
                      |   - OpenAPI 3.1 Contract              |
                      +---------+-------------------+---------+
                                |                   |
                 +--------------+                   +-------------+
                 v                                                v
      +----------------------+                         +--------------------+
      |  PostgreSQL 16       |                         |  Redis 7           |
      |  - PostGIS (Geo)     |                         |  - Rate Limiting   |
      |  - pgvector (Embeds) |                         |  - Session Cache   |
      |  - pg_trgm (Fuzzy)   |                         |  - RQ Queue Bus    |
      +----------------------+                         +---------+----------+
                 |                                               |
                 |                                               v
      +----------------------+                         +--------------------+
      |  MinIO Object Store  |                         |  Background Worker |
      |  - Signed S3 URLs    |                         |  (Python + OCR)    |
      |  - Magic-byte check  |                         |  - PyTesseract/Doc |
      +----------------------+                         |  - Embedding Sync  |
                                                       +--------------------+
```

## 2. Directory Layout
```
landos/
├── frontend/        # React 18 + Vite + TS + Tailwind + i18next + TanStack Query + Zustand
├── backend/         # FastAPI, SQLAlchemy 2 (async), Alembic, Pydantic v2
│   ├── app/
│   │   ├── core/         # Config, logging, security, db session, redis
│   │   ├── modules/
│   │   │   ├── auth/     # Argon2id, httpOnly JWT, session management
│   │   │   ├── rbac/     # Deny-by-default permission checks
│   │   │   ├── documents/# OCR pipeline, metadata extraction, signed URLs
│   │   │   ├── search/   # Trigram & vector hybrid search
│   │   │   ├── guide/    # Grounded RAG knowledge base assistant
│   │   │   ├── map/      # GeoJSON parcel boundary visualization
│   │   │   ├── review/   # Human-in-the-loop document validation
│   │   │   ├── quality/  # Image quality scoring & blur detection
│   │   │   └── admin/    # Hash-chained audit logs, user management
│   │   └── main.py
│   └── tests/
├── workers/         # Background processing (RQ) for heavy OCR & embedding extraction
├── ml/              # Training pipelines, Bengali OCR dataset generation, evaluation
│   ├── data/
│   ├── notebooks/
│   ├── src/
│   └── models/
├── data/            # Synthetic data generation & verified knowledge base markdown
│   ├── synthetic/
│   ├── seed/
│   └── knowledge/
├── infra/           # Nginx reverse proxy, Prometheus, Grafana provisioning
├── docs/            # Concept note, architecture, decisions, changelog
├── docker-compose.yml
├── Makefile
├── .env.example
└── .github/workflows/ci.yml
```

## 3. Core Architectural Pillars

### 3.1 Epistemic Trust States
No OCR output or probabilistic model inference is ever displayed as authoritative legal truth. Every field in the database and API payload carries:
1. `OCR_EXTRACTED`: Unverified OCR output.
2. `POSSIBLE_MATCH`: Algorithmic suggestion based on fuzzy trigram or vector similarity.
3. `USER_CORRECTED`: Value edited by user.
4. `VERIFIED_AUTHORIZED_SOURCE`: Authority-signed truth verified against official registries.
5. `VERIFICATION_REQUIRED`: Discrepancy detected requiring land office review.

### 3.2 Grounded AI Guide (Zero Hallucination)
- Uses pre-vetted legal acts (State Acquisition and Tenancy Act 1950, Non-Agricultural Tenancy Act, Land Development Tax Ordinance, Registration Act 1908, Citizen Charters).
- Vector retrieval with strict cosine threshold (>= 0.78).
- If no document chunk qualifies, the system returns `{"status": "needs_verification"}` displaying *"তথ্য যাচাই প্রয়োজন"*.

### 3.3 Security & Compliance
- **Auth**: Argon2id password hashing + httpOnly `SameSite=Lax` secure session cookies.
- **RBAC**: Deny-by-default policy model (`citizen`, `staff`, `admin`).
- **File Ingestion**: Magic byte inspection (rejecting masqueraded executables) + S3 signed URL upload.
- **Auditability**: Hash-chained audit log records every mutation, access, and status change.
