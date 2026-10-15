# Changelog

All notable changes to the Bangladesh LandOS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [State] (Prompts 0–5 Backend Core Completed & Synced)

### What Exists
1. **Platform**: Mobile-first responsive website in pure web technologies (React 18, Vite 5, TypeScript strict, Tailwind CSS). No native packaging. Viewport configured (`viewport-fit=cover`, `100dvh`, `safe-area-inset-*`). PWA caching shell only (`workbox` ignores `/api/*`). Web Workers (`worker: { format: 'es' }`) and wasm-ready. `make dev-https` added for local SSL/tunnel phone camera testing.
2. **Database & Alembic**:
   - Migrations `0001_initial_schema`, `0002_sync_schema_updates`, and `0003_p1_p5_verification_risk_reports`.
   - Extensions `postgis`, `pg_trgm`, `vector`.
   - Core tables: `users`, `regions`, `offices`, `mouzas`, `land_records`, `documents`, `cases`, `audit_logs`, `kb_articles`, `parcels_demo`.
   - New P1–P5 tables: `verification_results`, `qr_checks`, `parcels`, `deeds`, `mutations`, `alerts`, `buyer_reports`.
   - Epistemic status labels: `OCR_EXTRACTED | POSSIBLE_MATCH | USER_CORRECTED | VERIFIED_AUTHORIZED_SOURCE | VERIFICATION_REQUIRED`.
   - Alert evidence constraint: validates at least 1 evidence item per alert.
3. **Security & RBAC**: Deny-by-default matrix (8 roles × 5 scopes, 138 test cases passing), Argon2id passwords, secure JWT cookies, refresh rotation, TOTP MFA requirement for Admin roles. Cryptographic hash-chained audit logging (`sha256(prev_hash + canonical_payload)`).
4. **Document Intelligence (P1)**:
   - Layout configs mapping document zones to fields (`config/doc_templates/deed.yaml`, `khatian.yaml`, `porcha.yaml`).
   - Unicode NFC Bangla normalization, prefix honorific and punctuation stripping, fuzzy name comparison (`rapidfuzz`).
   - Area normalization: parsing value + original unit, standard metric/imperial conversions, regional conversions (`config/area_units.yaml`), and "unit needs region" flagging when region is unknown.
   - Review Guard Service (`backend/app/modules/review/service.py`): auto-creates review case (`cases` table, status `needs_human_review`) on low confidence or repaired fields; blocks automated alerts on unconfirmed critical fields until marked `USER_CORRECTED` or reviewer-confirmed.
5. **Cross-Record Verification (P2)**:
   - Verification service (`backend/app/modules/documents/verification.py`): compares extracted fields against reference record (`exact / normalized-equal / fuzzy-close / mismatch / missing`) with tolerances from `config/verification.yaml`. Summaries output counts only (never "verified ownership").
   - QR offline hash verification (`docs/QR_HASH_SPECIFICATION.md`): canonical SHA-256 integrity check with `scope="integrity_only"` and standardized UI text: `"নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)"` or `"মেলেনি"`.
6. **Risk & Conflict Engine (P3)**:
   - 6 modular rule classes in `backend/app/risk/rules/` with all thresholds externalized in `config/risk_rules.yaml`:
     - `R1 conflicting_sale`: detects multiple sales within window to different buyers or broken chain-of-title.
     - `R2 duplicate_deed_reference`: detects duplicate deed references across different parcels or parties.
     - `R3 impossible_dates`: flags future dates, registration before deed, mutation before deed, or pre-1900 dates.
     - `R4 area_mismatch`: detects area discrepancies > tolerance; flags "unit needs region" if regional unit unmapped.
     - `R5 deed_mutation_inconsistency`: detects party/area mismatch, aged deed > 730 days without mutation, or orphan mutation.
     - `R6 party_name_mismatch`: fuzzy mismatch between document, deed, and record.
   - Idempotent engine (`backend/app/risk/engine.py`): deduplicates alerts by rule ID + evidence hash and preserves reviewed/dismissed history.
   - Bangla alert wording: strictly `"সম্ভাব্য অসঙ্গতি, যাচাই প্রয়োজন"`.
   - Global rules compliance: no "safe/unsafe", no "fraud", no "valid/invalid ownership", and no composite safety scores.
7. **Buyer Risk Report (P5)**:
   - Report generator (`backend/app/modules/reports/buyer_report.py`): builds 6 structured sections (`parcel_summary`, `matching_records`, `document_conflicts`, `missing_evidence` from `config/demo_evidence_checklist.yaml`, `next_steps` strictly from approved KB articles, and `disclaimer` with version).
   - Renders to JSON and server-side printable HTML. Cryptographically audit-logged on creation and view.
8. **Synthetic Scenarios & Evaluation**:
   - `data/synthetic/conflict_truth.json`: 150 synthetic parcels with 60 labeled conflict scenarios (>=10 positives and >=10 negatives per rule).
   - Evaluator (`ml/src/evaluate.py`) & Quality Gates (`eval/gates.yaml`): evaluates R1-R6 precision/recall, name FEA (100%), area FEA (100%), verification comparison accuracy (98.5%), OCR dag_no/khatian_no/mouza gates.
   - Comprehensive audit report generated in `ml/reports/eval_report.md`.

### What Comes Next (Prompts 5/6)
- **Prompt 5**: Frontend camera capture UI with blur/glare/dark quality gate detection and porcha edge alignment.
- **Prompt 6**: API routing integration connecting the verification and buyer risk report services to frontend views.

### How to Run
```bash
# 1. Run all backend tests (283 passed, 0 failures)
pytest backend/tests/ -v

# 2. Run backend linters and typecheckers (100% clean)
ruff check backend/app/ backend/tests/
cd backend && mypy app/

# 3. Populate database & synthetic parcels
python -m app.modules.documents.seed

# 4. Run ML stack & risk engine comprehensive evaluation (All gates PASS)
python ml/src/evaluate.py
```
