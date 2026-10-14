"""
Worker tasks for Bangladesh LandOS.
"""

import logging
import time

logger = logging.getLogger("landos.tasks")

def process_document_ocr(document_id: str):
    logger.info(f"Starting OCR task for document_id={document_id}")
    time.sleep(1) # Simulated OCR pipeline
    logger.info(f"OCR successfully completed for document_id={document_id}")
    return {"status": "completed", "document_id": document_id}

def sync_kb_embeddings(article_id: str):
    logger.info(f"Syncing embeddings for knowledge article_id={article_id}")
    time.sleep(0.5)
    return {"status": "indexed", "article_id": article_id}
