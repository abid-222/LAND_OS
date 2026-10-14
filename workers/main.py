"""
Bangladesh LandOS — Background Task Worker
Processes document OCR, Bengali text normalization, entity extraction, and vector embedding synchronization.
"""

import os
import sys
import logging
from redis import Redis
from rq import Worker, Queue, Connection

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("landos.worker")

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")
QUEUE_NAME = os.getenv("RQ_QUEUE_NAME", "landos_default")

def main():
    logger.info(f"Connecting LandOS RQ Worker to Redis at {REDIS_URL}...")
    redis_conn = Redis.from_url(REDIS_URL)
    with Connection(redis_conn):
        queue = Queue(QUEUE_NAME)
        logger.info(f"Listening to queue '{QUEUE_NAME}' for OCR and Document processing tasks...")
        worker = Worker([queue], connection=redis_conn)
        worker.work(with_scheduler=True)

if __name__ == "__main__":
    main()
