# Changelog

All notable changes to the Bangladesh LandOS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [State] (Prompts 0–3 Completed & Synced)

### What Exists
1. **Platform**: Mobile-first responsive website in pure web technologies (React 18, Vite 5, TypeScript strict, Tailwind CSS). No native packaging (no React Native, Flutter, Capacitor, Cordova). Viewport configured (`viewport-fit=cover`, `100dvh`, `safe-area-inset-*`). PWA caching shell only (`workbox` ignores `/api/*`). Web Workers (`worker: { format: 'es' }`) and wasm-ready. `make dev-https` added for local SSL/tunnel phone camera testing.
2. **Database & Alembic**: Migrations `0001_initial_schema` and `0002_sync_schema_updates`. Extensions `postgis`, `pg_trgm`, `vector`. Indexes: composite `(mouza_id, main_no, sub_no)` and `(mouza_id, khatian_no, dag_no)`, unique `record_no`, GIN trigram on Bangla names. Models include `main_no`, `sub_no`, `repaired`, `flagged`, `flag_reason`, `user_corrected`, `status_label` (enum: `OCR_EXTRACTED`, `POSSIBLE_MATCH`, `USER_CORRECTED`, `VERIFIED_AUTHORIZED_SOURCE`, `VERIFICATION_REQUIRED`), and `idempotency_key` on documents.
3. **Security & RBAC**: Deny-by-default matrix (8 roles × 5 scopes, 138 test cases passing), Argon2id passwords, secure JWT cookies, refresh rotation, TOTP MFA requirement for Admin roles. Cryptographic hash-chained audit logging (`sha256(prev_hash + canonical_payload)`).
4. **Synthetic Data**:
   - `data/seed/land_records_5000.json`: 5,250 synthetic records across 40 mouzas with sub-numbers (e.g. `1234/1`) and deliberate near-duplicates.
   - `data/synthetic/documents/`: 310 degraded Khatian Porcha scans rendered in 3 Bangla fonts with QR codes, labeled degradation lists, quality tiers (35 intentionally BAD, 35 GOOD, 240 MEDIUM), per-image ground-truth bounding box JSONs, and `data/synthetic/splits.json` (partitioned by record ID).
   - `data/synthetic/match_pairs.json`: 1,200 labeled pairs (600 positive, 600 hard negative).
   - `data/kb/*.md`: 12 verified knowledge-base articles in simple Bangla with frontmatter and SAMPLE CONTENT demo notices.
   - `data/synthetic/parcels_demo.geojson`: 160 cadastral parcel polygons + road/water layers with `is_illustrative: true`.
5. **Normalization Contract**:
   - `config/identifier_patterns.yaml`: Configurable regex for `dag_no` and `khatian_no`.
   - `data/normalize_cases.json`: 65 shared test cases covering Bangla/ASCII/mixed digits, zero-width chars, spaces, sub-numbers, leading zeros, O-vs-0, danda, idempotency, and overflow.
   - Modules `backend/app/core/normalize.py` and `frontend/src/lib/normalize.ts` with test suites marked xfail/fails for Prompt 4.
6. **Evaluation & Quality Gates**:
   - `eval/gates.yaml`: Thresholds for `dag_no` FEA (0.95), silent error rate (0.02), CER (0.05), WER (0.10).
   - `ml/src/evaluate.py`: Wired to enforce gates and fail execution if a gate is breached.

### What Prompt 4+ Must Build
- **Prompt 4**: Implement the full normalization engine in `backend/app/core/normalize.py` and `frontend/src/lib/normalize.ts` to satisfy all 65 test cases in `data/normalize_cases.json`.
- **Prompt 5**: On-device camera capture UI with blur/glare/dark quality gate detection and porcha edge alignment.
- **Prompt 6**: Bengali OCR extraction pipeline and match candidate scorer using trained ML models.
- **Prompt 7**: Citizen scan-to-search flow, Porcha field repair editor, and case workflow tracking.

### How to Run
```bash
# 1. Start full local environment in Docker (or backend/frontend individually)
make dev

# 2. Or start frontend dev server with HTTPS for real phone camera testing
make dev-https

# 3. Populate database & object storage from synthetic files
make seed

# 4. Run test suites (backend pytest 143 passed + 65 xfail; frontend vitest passed)
make test

# 5. Check ML quality gates
make eval
```
