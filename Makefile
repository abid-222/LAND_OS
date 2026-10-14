.PHONY: help dev test seed train eval client lint clean build

PYTHON ?= python
NPM ?= npm

help:
	@echo "Bangladesh LandOS — Command Reference"
	@echo "  make dev      - Start frontend and backend in local development mode"
	@echo "  make test     - Run pytest (backend) and vitest + playwright (frontend)"
	@echo "  make seed     - Populate synthetic land records & knowledge base"
	@echo "  make train    - Execute Bengali OCR & NER model training"
	@echo "  make eval     - Evaluate OCR CER/WER and RAG similarity metrics"
	@echo "  make client   - Export OpenAPI schema and regenerate TypeScript client"
	@echo "  make lint     - Run code quality linters (ruff, mypy, eslint, tsc)"
	@echo "  make build    - Build production docker containers"

dev:
	docker compose up --build

test:
	cd backend && pytest tests/ -v
	cd frontend && npm run test:run

seed:
	cd backend && $(PYTHON) -m app.modules.documents.seed

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
