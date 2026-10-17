# Architecture Decision Records (ADR)

## ADR-0001: Pure Responsive Web vs Hybrid/Native Apps
- **Status**: Accepted
- **Context**: Bangladesh citizens access digital services across diverse entry-level smartphones with limited storage and high app-store download friction.
- **Decision**: Standard web stack (React 18 + Vite + Tailwind CSS + PWA) accessed via normal browsers. No React Native, Flutter, Cordova, or Capacitor.
- **Consequences**: Zero install overhead, universal accessibility across Android Chrome and iOS Safari, dynamic imports keeping initial JS < 150 KB gzip.

## ADR-0002: Epistemic Data Trust Model
- **Status**: Accepted
- **Context**: OCR and NLP on century-old Bengali manuscripts (CS/SA/RS) produce occasional ambiguities. Displaying probabilistic matches as official truth causes real-world land conflict.
- **Decision**: Strict 5-tier status enum (`OCR_EXTRACTED`, `POSSIBLE_MATCH`, `USER_CORRECTED`, `VERIFIED_AUTHORIZED_SOURCE`, `VERIFICATION_REQUIRED`). Only backend logic can mark `VERIFIED_AUTHORIZED_SOURCE`. All demo data is explicitly marked synthetic.
- **Consequences**: Unambiguous UI state, legally responsible presentation.

## ADR-0003: FastAPI + SQLAlchemy 2 + Pydantic v2 Backend
- **Status**: Accepted
- **Context**: High-performance asynchronous REST API with strict type contracts and OpenAPI generation for TypeScript client sync.
- **Decision**: Python 3.11 with FastAPI, async SQLAlchemy 2, Alembic migrations, and Pydantic v2 schemas.
- **Consequences**: Native async I/O, seamless openapi-typescript client code generation, fast validation.

## ADR-0004: PostgreSQL 16 + PostGIS + pgvector + pg_trgm
- **Status**: Accepted
- **Context**: Bangladesh LandOS requires geospatial boundary checks (cadastral mouza parcels), Bengali trigram text search (fuzzy names and mouza names), and vector embeddings for the AI Guide.
- **Decision**: Single unified PostgreSQL 16 database leveraging PostGIS, pgvector, and pg_trgm extensions.
- **Consequences**: Eliminates separate vector/geo databases, simplifies transactional consistency and backup operations.

## ADR-0005: Resilient Storage, Route Protection, and Cross-Site Auth Architecture
- **Status**: Accepted
- **Context**: Free-tier cloud deployments (Render + Vercel) frequently run without dedicated Redis workers or MinIO object storage services. Additionally, cross-origin cookies between vercel.app and onrender.com require strict cookie security, CSRF protection, and explicit CORS scoping.
- **Decision**:
  1. Implemented `StorageBackend` abstraction with MinIO primary and local disk (`data/storage`) fallback.
  2. Implemented `_run_inline_ocr` fallback when Redis/RQ is absent so file uploads and OCR processing succeed on serverless/single-container hosts.
  3. Replaced BaseHTTPMiddleware timeout with pure ASGI `RequestTimeoutMiddleware` with route-class thresholds (exempting SSE, extending heavy routes to 60s).
  4. Added configurable `COOKIE_SAMESITE` / `COOKIE_SECURE` supporting Vercel `/api/:path*` rewrite proxy for first-party same-site cookies.
  5. Enforced startup lifespan check blocking default `SECRET_KEY` in production, and guarded TOTP bypass behind explicit `ALLOW_DEV_MFA_BYPASS=True` (strictly forbidden in non-dev).
  6. Added automated `test_route_protection.py` verifying every route is authenticated or in an explicit public allow-list.
- **Consequences**: Zero-crash deployments on Render free tier; complete RBAC security and first-party cookie support across Vercel frontend.

