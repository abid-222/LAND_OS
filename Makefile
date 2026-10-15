.PHONY: help dev dev-https test seed train eval client lint clean build models doctor smoke demo-reset

PYTHON ?= python
NPM ?= npm

help:
	@echo "Bangladesh LandOS — Command Reference"
	@echo "  make dev        - Start frontend and backend in local development mode"
	@echo "  make dev-https  - Start frontend with HTTPS for camera testing on mobile"
	@echo "  make test       - Run pytest (backend) and vitest + playwright (frontend)"
	@echo "  make doctor     - Run fast diagnostic connectivity check across all services"
	@echo "  make smoke      - Run full end-to-end scripted smoke test journey"
	@echo "  make seed       - Populate synthetic land records & knowledge base"
	@echo "  make demo-reset - Reset demo database and storage back to baseline seed state"
	@echo "  make models     - Build / train machine learning models"
	@echo "  make train      - Execute Bengali OCR & candidate match scorer training"
	@echo "  make eval       - Evaluate OCR metrics, gates, candidate match, guide RAG"
	@echo "  make client     - Export OpenAPI schema and regenerate TypeScript client"
	@echo "  make lint       - Run code quality linters (ruff, mypy, eslint, tsc)"
	@echo "  make build      - Build production docker containers"

dev:
	docker compose up --build

dev-https:
	@echo "Starting frontend dev server with HTTPS for camera testing..."
	@echo "Real Phone Tunnel: 'cloudflared tunnel --url http://localhost:5173' or 'ngrok http 5173'"
	cd frontend && $(NPM) run dev:https

test:
	cd backend && pytest tests/ -v
	cd frontend && npm run test:run

doctor:
	$(PYTHON) scripts/doctor.py

smoke:
	$(PYTHON) scripts/smoke_test.py

demo-reset:
	$(PYTHON) scripts/demo_reset.py

seed:
	cd backend && $(PYTHON) -m app.modules.documents.seed

models:
	@echo "Checking or training ML models..."
	cd ml && $(PYTHON) src/train.py

train:
	cd ml && $(PYTHON) src/train.py

eval:
	cd ml && $(PYTHON) src/evaluate.py

client:
	cd backend && $(PYTHON) -c "from app.main import export_openapi; export_openapi('../frontend/src/api/openapi.json')"
	cd frontend && $(NPM) run generate:client

lint:
	cd backend && ruff check app/ tests/ && mypy app/
	cd frontend && $(NPM) run lint && $(NPM) run typecheck

build:
	docker compose build

clean:
	docker compose down -v
