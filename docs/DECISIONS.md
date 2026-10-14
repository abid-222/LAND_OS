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
