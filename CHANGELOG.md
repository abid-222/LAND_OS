# Changelog

All notable changes to the Bangladesh LandOS project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Monorepo structure: `frontend/`, `backend/`, `workers/`, `ml/`, `data/`, `infra/`, `docs/`.
- Backend FastAPI app with Pydantic v2, SQLAlchemy 2 async engine, structured JSON logging, CORS configuration, and `/api/v1/health` (liveness + readiness).
- Frontend responsive web app with Vite, React 18, TypeScript (strict), Tailwind CSS, TanStack Query, Zustand, React Router, and i18next (Bangla default).
- Dynamic mobile-first design tokens, safe area padding, sticky navigation thumb zone, and Epistemic Trust status badge system.
- Docker compose configuration orchestrating `web`, `api`, `worker`, `db` (PostGIS + pgvector), `redis`, `minio`, `prometheus`, and `grafana`.
- Makefile with targets (`make dev`, `make test`, `make seed`, `make train`, `make eval`, `make client`, `make lint`).
- Comprehensive GitHub Actions CI workflow with ruff, mypy, pytest, eslint, tsc, vitest, and playwright.
- OpenAPI specification export and TypeScript client generator.
- Grounded knowledge base documentation sample with verification timestamps.
