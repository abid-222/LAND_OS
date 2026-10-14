FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including tesseract and Bengali language pack
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    libpq-dev \
    tesseract-ocr \
    tesseract-ocr-ben \
    && rm -rf /var/lib/apt/lists/*

COPY workers/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/app /app/backend/app
COPY workers /app/workers

ENV PYTHONPATH=/app/backend:/app

CMD ["python", "workers/main.py"]
