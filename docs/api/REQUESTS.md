# Frontend API Requests & Audit Coordination

This document tracks all frontend-facing needs, API contracts, and package audit items. As per engineering policy, backend owns `backend/`, `workers/`, `ml/`, `data/`, `infra/`, `docs/`, `eval/`, and `config/`. No direct modifications are applied to `frontend/`.

## 1. Security & NPM Audit Findings
- **Date**: October 2026 Audit
- **Findings**: Frontend runs Vite 5 + React 18 with Tailwind CSS. `npm audit` should be run in CI to verify frontend dev-dependencies (Playwright, Recharts, Workbox).
- **Request to Frontend Team**:
  - Keep `@types/node` and build dependencies up to date.
  - Retain `credentials: 'include'` on `fetch` / Axios calls so the httpOnly SameSite secure cookies are sent.
  - Send `X-CSRF-Token` header on state-changing requests (`POST`, `PUT`, `PATCH`, `DELETE`) matching the `landos_csrf_token` cookie.

## 2. API Contract & New Feature Endpoints
The following endpoints have been added to the backend in Section 7:
1. **Password Change & Reset**:
   - `POST /api/v1/auth/password/change` (`current_password`, `new_password`)
   - `POST /api/v1/auth/password/reset-request` (`email`)
   - `POST /api/v1/auth/password/reset-confirm` (`email`, `token`, `new_password`)
2. **User Management & Role Assignment Ceiling**:
   - `POST /api/v1/admin/users` (Admin/Office Admin user creation with role limits)
   - `PATCH /api/v1/admin/users/{id}/disable` (Disable user account)
   - `PATCH /api/v1/admin/users/{id}/role` (Update role within allowed role ceiling)
3. **Case Assignment & Reassignment**:
   - `PATCH /api/v1/review/cases/{id}/assign` (`reviewer_id`, `notes`)
4. **In-App Notifications**:
   - `GET /api/v1/notifications` (List notifications for current user)
   - `PATCH /api/v1/notifications/{id}/read` (Mark notification as read)
5. **Human-in-the-Loop Feedback**:
   - `POST /api/v1/feedback/corrections` (Submit labeled correction for evaluation dataset)
6. **Consent Tracking**:
   - `POST /api/v1/consent` (Record camera / privacy / storage consent)
   - `GET /api/v1/consent/latest` (Check latest consent status)
7. **CSV Record Import**:
   - `POST /api/v1/records/import-csv` (Multipart CSV upload with provenance)

## 3. Storage & Download Signed URLs
- `GET /api/v1/documents/{id}/download-url`: Returns a temporary presigned URL (valid for <= 5 minutes) to download document scans securely without public bucket access.
