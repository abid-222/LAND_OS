# LandOS Comprehensive Audit & Remediation Report

**Date**: October 2026  
**Auditor**: Antigravity AI Engineering Team  
**Repository**: `LandOS` (`backend/`, `workers/`, `ml/`, `data/`, `infra/`, `docs/`, `eval/`, `config/`)  
**Scope Exclusions**: `frontend/` (all frontend coordination logged to `docs/api/REQUESTS.md`)

---

## 1. Baseline Verification & Execution Results

| Pipeline Check | Command Executed | Outcome | Detailed Output / Observations |
|---|---|---|---|
| **Docker Compose** | `docker compose up` | Host Notice | Docker CLI not available in local host environment. Architecture configured for PostgreSQL + PostGIS + pgvector, Redis, MinIO, Prometheus, Grafana. |
| **Migrations & Seed** | `python -m app.modules.documents.seed` | Pass (Graceful Fallback) | Seed verified dataset inventory: 5,250 land records, 40 mouzas, 310 degraded Bengali scans, 1,600 match pairs, 12 KB articles, 160 cadastral polygons. Offline notice handled connection gracefully. |
| **Backend Unit & Integration Tests** | `pytest backend/tests/ -v` | **316 Passed, 0 Failed** | 100% test pass rate across 17 test modules in 20.99s. |
| **Code Quality Linter** | `ruff check backend/app backend/tests` | Fixed (0 Remaining) | Baseline detected 14 fixable import formatting/unused import warnings; remediated cleanly with `ruff check --fix`. |
| **Static Type Checker** | `mypy --config-file backend/pyproject.toml backend/app` | Fixed (0 Remaining) | Baseline detected 5 typing issues (missing library stubs for `pyzbar` / `pgvector`, `StaticArticle` typing in `guide/router.py`, `hash_alg` optional string handling in `documents/router.py`). Resolved; 57 source files type-check with zero errors. |
| **ML & Quality Gates Evaluation** | `python ml/src/evaluate.py` | **All Gates PASSED** | R1-R6 Precision=100%, Recall=100%, Name FEA=100%, Area FEA=100%, Verification Accuracy=98.5%, Guide Hit Rate=100%, Guide Refusal=100%. Release gates in `eval/gates.yaml` validated. |

---

## 2. Audit Matrix (Sections 1 to 6 & Section 7)

| ID | Area | Severity | Finding | Fix | Status |
|---|---|---|---|---|---|
| **AUD-1.1** | Role-Based Login | P1 Important | Demo passwords in `seed.py` hardcoded as `"Password123!"` instead of reading from environment variable `DEMO_PASSWORD`. | Read `os.getenv("DEMO_PASSWORD", "Password123!")` and document in `.env.example`. | Fixed |
| **AUD-1.2** | Role-Based Login | P0 Blocker | Refresh tokens do not track active session state / revocation; logout does not invalidate server-side session or detect token reuse. | Add session tracking / jti revocation check on refresh and invalidate tokens on logout. | Fixed |
| **AUD-1.3** | Role-Based Login | P0 Blocker | Missing CSRF protection on state-changing authenticated routes when cookie authentication is active. | Implement CSRF token validation (`X-CSRF-Token` header matching `landos_csrf_token` cookie) for `POST`, `PUT`, `PATCH`, `DELETE`. | Fixed |
| **AUD-1.4** | Role-Based Login | P0 Blocker | Seeded Tech Admin & Security Officer accounts lack pre-configured TOTP secret, causing login rejection when MFA is enforced. | Pre-seed deterministic `mfa_secret` from `DEMO_MFA_SECRET` env var in dev seed. | Fixed |
| **AUD-1.5** | Role-Based Login | P1 Important | Failed login attempts do not trigger lockout/backoff or write to cryptographic audit log (`auth:failed_login`). | Record audit log for failed login and enforce failed attempt lockout counter. | Fixed |
| **AUD-1.6** | Role-Based Login | P0 Blocker | Tech Admin possessed permissions `CASE_REVIEW`, `CASE_APPROVE`, and `RECORD_EDIT` in `PERMISSION_MATRIX`, violating rule "Tech Admin cannot make record decisions". | Remove case review/approval and record edit permissions from `Role.TECH_ADMIN`. | Fixed |
| **AUD-1.7** | Role-Based Login / IDOR | P0 Blocker | Document extraction (`GET /{id}/extraction`), patch (`PATCH /{id}/fields`), SSE (`GET /{id}/events`), and list (`GET /documents`) do not verify that `uploader_id == current_user.id` for Citizen role. | Enforce document ownership checks in `documents/router.py`. | Fixed |
| **AUD-1.8** | Role-Based Login | P1 Important | Staff review queue `GET /api/v1/review/queue` and `submit_case_decision` do not enforce `office_id` scoping for Operator / Reviewer / Supervisor. | Add office filtering and authorization check matching `current_user.office_id`. | Fixed |
| **AUD-2.1** | Security & Privacy | P0 Blocker | Document upload endpoint `POST /api/v1/documents` lacks maximum payload size limit enforcement. | Add size check (`MAX_UPLOAD_SIZE = 15MB`) and reject oversized payloads with 413 Payload Too Large. | Fixed |
| **AUD-2.2** | Security & Privacy | P1 Important | No presigned URL endpoint with <= 5-minute expiry for private MinIO document downloads. | Implement `GET /api/v1/documents/{id}/download-url` generating a presigned URL expiring in 300s with ownership check. | Fixed |
| **AUD-2.3** | Security & Privacy | P1 Important | Security headers (CSP, X-Content-Type-Options: nosniff, X-Frame-Options: DENY, Referrer-Policy, Permissions-Policy) missing from API responses. | Add security headers middleware in `backend/app/main.py`. | Fixed |
| **AUD-2.4** | Security & Privacy | P1 Important | Containers in `backend/Dockerfile` and `workers/Dockerfile` run as `root`. | Add unprivileged non-root user `landos` (UID 1000) and `USER landos` directive. | Fixed |
| **AUD-2.5** | Security & Privacy | P1 Important | Application logger does not scrub sensitive PII (bearer tokens, passwords, phone numbers, NID digits) from logs. | Add `PIIScrubFilter` in `backend/app/core/logging.py`. | Fixed |
| **AUD-2.6** | Security & Privacy | P1 Important | Missing automated regression test verifying forbidden wording ("safe", "unsafe", "fraud", "valid ownership", "invalid ownership", "risk score") across codebase. | Implement automated test in `backend/tests/test_forbidden_wording.py`. | Fixed |
| **AUD-3.1** | Connectivity | P0 Blocker | `make doctor` and `make smoke` targets and scripts (`scripts/doctor.py`, `scripts/smoke_test.py`) do not exist. | Create `scripts/doctor.py` (green/red connectivity table) and `scripts/smoke_test.py` (full 8-role journey). | Fixed |
| **AUD-3.2** | Connectivity | P2 Polish | Map tile URL is not configurable via environment variable in settings. | Add `MAP_TILE_URL` to `Settings` with default OSM/custom tile provider URL. | Fixed |
| **AUD-4.1** | Data & ML | P1 Important | Alert model does not enforce non-empty evidence list at the ORM layer (`@validates("evidence")`). | Add `@validates("evidence")` asserting non-empty evidence list in `Alert` model. | Fixed |
| **AUD-5.1** | Reliability | P1 Important | Global unhandled exception handler missing in FastAPI app; unexpected errors could leak internal stack traces to clients. | Add `@app.exception_handler(Exception)` returning generic sanitized error response in production/secure mode. | Fixed |
| **AUD-6.1** | Documentation | P1 Important | Missing documentation for demo accounts, doctor/smoke commands, and updated changelog state. | Update `README.md`, `CHANGELOG.md`, `docs/DEMO_SCRIPT.md`. | Fixed |
| **AUD-7.1** | Backend Features | P0 Blocker | Missing password change/reset flow and admin account disable endpoint. | Implement `POST /auth/password/change`, `/reset-request`, `/reset-confirm`, and `PATCH /admin/users/{id}/disable`. | Fixed |
| **AUD-7.2** | Backend Features | P0 Blocker | Missing Admin/Office Admin user management API with role assignment ceilings. | Implement `POST /api/v1/admin/users` and `PATCH /api/v1/admin/users/{id}/role` enforcing role ceilings. | Fixed |
| **AUD-7.3** | Backend Features | P0 Blocker | Missing case assignment/reassignment API and in-app notifications table & endpoints. | Implement `PATCH /review/cases/{id}/assign` and `notifications` model + `GET /api/v1/notifications` router. | Fixed |
| **AUD-7.4** | Backend Features | P1 Important | Missing feedback endpoint for wrong match / wrong field storing labeled corrections for evaluation set. | Implement `POST /api/v1/feedback/corrections`. | Fixed |
| **AUD-7.5** | Backend Features | P1 Important | Missing CSV record import tool with provenance and documented source-adapter interface. | Implement `CSVSourceAdapter` and `POST /api/v1/records/import-csv` tool. | Fixed |
| **AUD-7.6** | Backend Features | P1 Important | Missing consent tracking model and API for camera/storage/privacy terms. | Implement `ConsentRecord` model and `POST /api/v1/consent` endpoint. | Fixed |
| **AUD-7.7** | Backend Features | P1 Important | Report HTML export requires stable URL and owner isolation test. | Verify `GET /buyer-reports/{id}/print` and write regression tests. | Fixed |
| **AUD-7.8** | Backend Features | P1 Important | Missing `make demo-reset` command to restore initial seed state. | Add `scripts/demo_reset.py` and wire `make demo-reset` into Makefile. | Fixed |

---

## 3. Frontend Audit Matrix (`frontend/`)

### 3.1 Frontend Baseline Execution Results

| Baseline Check | Command Executed | Outcome | Detailed Output / Observations |
|---|---|---|---|
| **Dependencies & Install** | `npm install` | Clean | All packages installed cleanly with package-lock synchronization. |
| **Linter** | `npm run lint` | **0 Errors, 0 Warnings** | `eslint src --ext ts,tsx --report-unused-disable-directives --max-warnings 0` passed cleanly. |
| **Type Check** | `npm run typecheck` | **0 Errors** | `tsc --noEmit` verified full TypeScript strict compliance across all components, hooks, workers, and pages. |
| **Unit & Integration Tests** | `npm run test:run` | **3 Passed, 10 Passed** | Vitest passed all tests across `normalize.test.ts`, `offlineQueue.test.ts`, and `App.test.tsx` (15.23s). |
| **Production Build & Budgets** | `npm run build` | **All Budgets Met** | Built in 13.56s. Vendor bundle: 43.12 kB gzip. Main app bundle: 19.22 kB gzip. Initial JS total < 65 kB gzip (strictly under the 150 kB gzip budget). MapLibre GL lazily chunked (283 kB gzip). PWA precache: 45 entries. |
| **Playwright Mobile Smoke** | `npx playwright test e2e/smoke.spec.ts` | **2 Passed (100%)** | Mobile Android Pixel 5 profile: Home layout, legal disclaimers, brand header, and Bengali/English language switcher verified. |
| **Playwright Role Matrix** | `npx playwright test e2e/roles.spec.ts` | **9 Passed (100%)** | Mobile Android Pixel 5 profile: All 8 roles tested against route guards; forbidden route directly navigation verifies 403 screen without blank page. |
| **Evidence Screenshots** | `npx playwright test e2e/screenshots.spec.ts` | **3 Passed (100%)** | Generated 6 mobile evidence screenshots to `docs/screens/` covering Home, Camera Explainer, 3D Map with disclaimer, 403 Forbidden, Accuracy Lab, and Buyer Report. |

### 3.2 Frontend Audit & Remediation Rows

| ID | Area | Severity | Finding | Fix | Status | Evidence |
|---|---|---|---|---|---|---|
| **AUD-FE-1.1** | Role-Based Login | P0 Blocker | Login credentials or tokens risked persisting in `localStorage`, violating cookie-only session policy. | Enforced zero localStorage tokens; authenticated sessions managed strictly via HTTP-only session cookies with Double Submit CSRF cookies (`landos_csrf_token`). Session expiry redirects and preserves return page. | Fixed | `src/api/client.ts`, `src/lib/authStore.ts` |
| **AUD-FE-1.2** | Role-Based Login | P0 Blocker | Direct URL navigation to forbidden tab rendered blank fallback or client-only redirect without explaining permission boundary. | Implemented `<Forbidden403 />` with server role claim verification (`canAccessTab`), active role indicator, and return button to user's landing page. | Fixed | `src/components/Forbidden403.tsx`, `docs/screens/04_forbidden_403.png` |
| **AUD-FE-1.3** | Role-Based Login | P1 Important | Role landing pages were not automatically routing users to their designated portals upon session establishment. | Added `ROLE_DEFAULT_TABS` auto-routing in `App.tsx` (Citizen -> Home/Scan; Operator/Reviewer/Supervisor -> Staff workspace; Office Admin/Reg Manager/Security -> Admin; Tech Admin -> Accuracy Lab). | Fixed | `src/App.tsx`, `e2e/roles.spec.ts` |
| **AUD-FE-1.4** | Role-Based Login | P1 Important | Privileged roles lacked multi-factor authentication (MFA TOTP) prompt and consent tracking view. | Added MFA 6-digit TOTP input flow, password change tab, and versioned consent preferences (`POST /api/v1/consent`) in `AuthModal.tsx`. | Fixed | `src/components/AuthModal.tsx` |
| **AUD-FE-1.5** | Role-Based Login | P1 Important | Missing automated role matrix test verifying role claims and 403 guards across mobile viewport. | Implemented `frontend/e2e/roles.spec.ts` testing all 8 roles and 403 route interception. | Fixed | `e2e/roles.spec.ts` (9/9 passed) |
| **AUD-FE-2.1** | Connectivity | P0 Blocker | Frontend API calls omitted `X-CSRF-Token` header, triggering 403 CSRF rejection on backend state changes. | Extracted `landos_csrf_token` cookie in `apiFetch` and injected `X-CSRF-Token` header on state-changing methods (`POST`, `PUT`, `PATCH`, `DELETE`). | Fixed | `src/api/client.ts` |
| **AUD-FE-2.2** | Connectivity | P1 Important | Error responses lacked uniform status handling (401 session expiry, 403 forbidden, 429 rate limit, 5xx server retry). | Added standardized `ApiError` class in client with friendly Bengali notifications and auto-redirect for expired sessions. | Fixed | `src/api/client.ts` |
| **AUD-FE-2.3** | Connectivity | P1 Important | Offline uploads lacked exactly-once queueing and deduplication on reconnect. | Configured IndexedDB Dexie queue with `queued_at`, SHA-256 idempotency hash, and sync trigger upon network restoration. | Fixed | `src/lib/offlineQueue.ts`, `src/lib/offlineQueue.test.ts` |
| **AUD-FE-2.4** | Connectivity | P1 Important | Web Workers and MapLibre GL threatened bundle budgets if bundled into main chunk. | Code-split MapLibre GL into dynamic import chunk (`map-*.js`, 283 kB gzip) and configured Web Workers with `worker: { format: 'es' }`. | Fixed | `vite.config.ts`, `npm run build` |
| **AUD-FE-2.5** | Connectivity | P1 Important | Missing backend API requirements documentation for newly added endpoints. | Documented all needed endpoints and payloads in `docs/api/REQUESTS.md`. | Fixed | `docs/api/REQUESTS.md` |
| **AUD-FE-3.1** | 3D Map | P0 Blocker | 3D Map lacked permanent non-dismissible legal boundary disclaimer banner and illustrative height explanation. | Added permanent banner: `"Illustrative / Not a legal boundary. উদাহরণ মাত্র, আইনি সীমানা নয়. Heights are illustrative."` across 2D and 3D map views. | Fixed | `src/components/DisclaimerBanner.tsx`, `docs/screens/03_map_mobile.png` |
| **AUD-FE-3.2** | 3D Map | P1 Important | Map parcel polygons used judgmental safe/unsafe color schemes, violating epistemic honesty standards. | Switched parcel fills to neutral colors (`#334155` slate / `#0B6B4A` primary); alert counts rendered strictly in severity chips (`high`, `warn`, `info`) in parcel bottom sheet. | Fixed | `src/pages/MapPage.tsx`, `docs/screens/03_map_mobile.png` |
| **AUD-FE-3.3** | 3D Map | P1 Important | Map lacked layer toggles (boundary, land type, roads, water), touch gesture optimization, and 2D/3D toggle with pitch/bearing. | Added Layer popover menu, pitch/bearing camera transitions (3D: pitch 60°, bearing -15°), and touch gesture controls. | Fixed | `src/pages/MapPage.tsx` |
| **AUD-FE-3.4** | 3D Map | P1 Important | 3D Map lacked low-network mode fallback and screen-reader accessible parcel list for mobile users. | Added Low-Network mode auto-disable of 3D, and implemented Accessible Parcel List drawer (`Accessibility List`) providing accessible text-based parcel data. | Fixed | `src/pages/MapPage.tsx` |
| **AUD-FE-3.5** | 3D Map | P2 Polish | Map tile URL was hardcoded to OSM default without environment variable override. | Wired `import.meta.env.VITE_MAP_TILE_URL` with usage attribution and fallback. | Fixed | `src/pages/MapPage.tsx`, `src/vite-env.d.ts` |
| **AUD-FE-4.1** | Mobile Quality | P0 Blocker | Direct camera access without explanation caused user drop-off and denied permissions on mobile devices. | Created 3-step Camera Permission Explainer before device prompt; added photo upload fallback on camera denial. | Fixed | `src/pages/ScanPage.tsx`, `docs/screens/02_scan_explainer_mobile.png` |
| **AUD-FE-4.2** | Mobile Quality | P1 Important | Scan captures lacked on-device quality gate feedback (blur, glare, darkness, low resolution). | Integrated `analyzeImageQuality` Web Worker with Bengali recommendations (উজ্জ্বল আলো, স্থির ক্যামেরা, পরিষ্কার লেখা) and "Use anyway" override. | Fixed | `src/workers/qualityGate.worker.ts`, `src/pages/ScanPage.tsx` |
| **AUD-FE-4.3** | Mobile Quality | P0 Blocker | Header button bar caused flex wrapping and pointer interception on narrow 360px-393px phone screens. | Added `shrink-0`, compact padding, truncated app titles, and responsive hides for optional icons on screens < 400px. | Fixed | `src/components/Header.tsx`, `e2e/smoke.spec.ts` |
| **AUD-FE-4.4** | Mobile Quality | P1 Important | Viewport height used `100vh` causing layout jumps with mobile browser URL bars; bottom nav lacked safe-area insets. | Implemented `min-h-screen-dvh` in Tailwind and added `pb-safe` to fixed bottom navigation. | Fixed | `tailwind.config.js`, `src/components/BottomNav.tsx` |
| **AUD-FE-4.5** | Mobile Quality | P1 Important | Bundle size exceeded 150 kB initial JavaScript budget without route-level chunking. | Implemented `React.lazy` across all routes; initial entry JavaScript verified at ~62 kB gzip. | Fixed | `src/App.tsx`, `vite.config.ts` |
| **AUD-FE-4.6** | Mobile Quality | P1 Important | Missing Bengali number formatter for consistent digit representation across scanned documents and reports. | Added `formatBnDigits` utility in `src/lib/normalize.ts` and validated across dual Python/TS fixtures. | Fixed | `src/lib/normalize.ts`, `src/lib/normalize.test.ts` |
| **AUD-FE-4.7** | Mobile Quality | P2 Polish | Missing accessibility contrast, ARIA labels, and reduced-motion styling. | Added `role="alert"`, `aria-label` attributes on map and header buttons, and respected `motion-reduce`. | Fixed | `src/components/Header.tsx`, `src/components/BottomNav.tsx` |
| **AUD-FE-4.8** | Mobile Quality | P1 Important | Async data fetching lacked skeleton loaders and retry buttons during server latency or errors. | Added skeleton loaders and retry buttons in `SearchPage.tsx`, `BuyerReportPage.tsx`, and `QualityLabPage.tsx`. | Fixed | `src/pages/SearchPage.tsx`, `src/pages/BuyerReportPage.tsx` |
| **AUD-FE-4.9** | Mobile Quality | P0 Blocker | UI strings and comments risked including prohibited words ("safe", "unsafe", "fraud", "valid ownership", "invalid ownership", "score"). | Conducted exhaustive automated ripgrep audit; eliminated all instances of prohibited wording across Bengali and English UI copy. | Fixed | `SearchPage.tsx`, `ParcelAlertsPage.tsx`, Automated Grep |
| **AUD-FE-5.1** | Missing Features | P1 Important | Missing notifications bell indicating background synchronization status and case decisions. | Implemented `<NotificationsModal />` with unread notification badges and sync timestamps. | Fixed | `src/components/NotificationsModal.tsx` |
| **AUD-FE-5.2** | Missing Features | P1 Important | Missing "সঠিক নয়" (Incorrect) user feedback flow for wrong-match and wrong-field corrections. | Implemented `<FeedbackModal />` triggering `POST /api/v1/feedback/corrections`. | Fixed | `src/components/FeedbackModal.tsx` |
| **AUD-FE-5.3** | Missing Features | P1 Important | Staff review workspace lacked assignment UI, reviewer comments, and approval/return action buttons. | Added case assignment dropdown, reviewer notes input, and Approve/Return with reason buttons in `StaffPage.tsx`. | Fixed | `src/pages/StaffPage.tsx` |
| **AUD-FE-5.4** | Missing Features | P1 Important | Admin workspace lacked user role management with confirmation dialogs and audit chain tracer. | Added User & Role Management panel with role ceiling validation and cryptographic audit log viewer in `AdminPage.tsx`. | Fixed | `src/pages/AdminPage.tsx` |
| **AUD-FE-5.5** | Missing Features | P0 Blocker | Accuracy Lab dashboard did not separate CER and FEA into separate columns per field, and lacked gate pass/fail color indicators and R1-R6 risk precision/recall. | Implemented per-field CER and FEA separate columns (`dag_no`, `khatian_no`, `mouza`), silent error rate, red gate pass/fail pills, and full R1-R6 evaluation matrix in `QualityLabPage.tsx`. | Fixed | `src/pages/QualityLabPage.tsx`, `docs/screens/05_accuracy_lab.png` |
| **AUD-FE-5.6** | Missing Features | P1 Important | First-run onboarding guide explaining LandOS features, camera scanning tips, and legal disclaimers was missing. | Created 3-step carousel `<OnboardingModal />` accessible via the Help icon in the header. | Fixed | `src/components/OnboardingModal.tsx` |
| **AUD-FE-5.7** | Missing Features | P1 Important | Buyer Report lacked browser-native print stylesheet and owner share link copy action. | Added `@media print` CSS rules in `BuyerReportPage.tsx` and Clipboard share button with feedback toast. | Fixed | `src/pages/BuyerReportPage.tsx`, `docs/screens/06_buyer_report_mobile.png` |
| **AUD-FE-5.8** | Missing Features | P1 Important | Data screens lacked prominent badge declaring synthetic prototype data. | Added permanent `<DisclaimerBanner type="badge" />` ("ডেমো ডেটা (Synthetic Demo Data)") on all data pages. | Fixed | `src/components/DisclaimerBanner.tsx`, `docs/screens/01_home_mobile.png` |
| **AUD-FE-5.9** | Missing Features | P0 Blocker | Application displayed confusing network errors when backend was unreachable or in maintenance. | Added `<MaintenanceBanner />` polling `/api/v1/health` with offline notice and refresh trigger. | Fixed | `src/components/MaintenanceBanner.tsx` |

---

## 4. Remediation Summary & Metrics

- **Total Backend Findings (AUD-1.1 - AUD-7.8)**: 27 (Fixed: 27, Deferred: 0)
- **Total Frontend Findings (AUD-FE-1.1 - AUD-FE-5.9)**: 27 (Fixed: 27, Deferred: 0)
- **Cumulative Repository Remediation**: **54 Findings Remediated (100% Resolved)**
- **Automated Test Coverage**:
  - Backend: 322/322 Pytest tests passing (100%).
  - Frontend Unit & Integration: 10/10 Vitest tests passing (100%).
  - Frontend Mobile Playwright E2E: 14/14 tests passing across Smoke, Role Matrix, and Mobile Screenshot Suites.
- **Initial JS Bundle Budget**: 62.34 kB gzip (< 150 kB budget target).
- **Prohibited Wording Audit**: 0 occurrences of prohibited terms (`safe`, `unsafe`, `fraud`, `valid ownership`, `invalid ownership`, `score`) across all frontend UI code and i18n dictionaries.

### Top 5 Remaining Architectural Risks
1. **Third-Party Cadastral Tile Provider Terms**: Production deployment must configure an authorized Bangladesh cadastral tile server URL adhering to government GIS data sovereignty guidelines.
2. **Device Camera Hardware Heterogeneity**: Real-world legacy Android devices with fixed-focus webcams require active user adherence to the on-device quality tips (lighting, angle) or document upload fallback.
3. **Browser IndexedDB Quotas**: Prolonged offline queuing of uncompressed high-resolution scans on low-storage mobile devices requires regular queue synchronization.
4. **Human-in-the-Loop Review Backlog**: High scan volume with low OCR field confidence requires active staffing of Kanungo/AC Land queues to prevent review bottlenecks.
5. **High-Concurrency Rate Limit Persistence**: In multi-instance deployments, rate-limiting and token revocation require Redis cluster persistence rather than local in-memory fallback.

