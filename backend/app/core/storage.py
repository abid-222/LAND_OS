"""
Storage Backend Abstraction for Bangladesh LandOS.
Supports:
1. MinIO / S3 Object Storage (primary in production with containerized MinIO/S3)
2. Local Disk Storage Fallback (automatic when MinIO is unreachable, dev, or Render free tier)
3. Download URL generator and direct byte streamer for document inspection.
"""

import io
import logging
import os
from typing import Optional, Tuple

import urllib3
from minio import Minio

from app.core.config import settings

logger = logging.getLogger("landos.storage")


class StorageBackend:
    """Unified storage interface with MinIO primary and local disk fallback."""

    def __init__(self):
        self.local_dir = os.path.abspath(settings.STORAGE_LOCAL_DIR)
        os.makedirs(self.local_dir, exist_ok=True)

    def _get_minio_client(self) -> Optional[Minio]:
        try:
            http_client = urllib3.PoolManager(timeout=0.2, retries=False)
            client = Minio(
                settings.MINIO_ENDPOINT,
                access_key=settings.MINIO_ACCESS_KEY,
                secret_key=settings.MINIO_SECRET_KEY,
                secure=settings.MINIO_USE_SSL,
                http_client=http_client,
            )
            # Fast ping by checking if bucket exists
            bucket = settings.MINIO_BUCKET
            if not client.bucket_exists(bucket):
                client.make_bucket(bucket)
            return client
        except Exception as e:
            logger.debug(f"MinIO client connection failed ({e}); local disk storage will be used.")
            return None

    def save(self, object_name: str, file_data: bytes, content_type: str) -> Tuple[bool, str, str]:
        """
        Saves file data to MinIO or falls back to local disk.
        Returns: (success: bool, backend_type: 'minio' | 'local', key: str)
        """
        # 1. Attempt MinIO
        minio_client = self._get_minio_client()
        if minio_client is not None:
            try:
                minio_client.put_object(
                    settings.MINIO_BUCKET,
                    object_name,
                    io.BytesIO(file_data),
                    length=len(file_data),
                    content_type=content_type,
                )
                logger.info(f"Saved {object_name} to MinIO bucket '{settings.MINIO_BUCKET}'.")
                return True, "minio", object_name
            except Exception as e:
                logger.warning(f"MinIO put_object failed ({e}); falling back to local disk.")

        # 2. Local Disk Fallback
        try:
            safe_rel_path = object_name.replace("/", os.sep).replace("\\", os.sep)
            # Remove any leading separator
            if safe_rel_path.startswith(os.sep):
                safe_rel_path = safe_rel_path[1:]
            full_path = os.path.join(self.local_dir, safe_rel_path)
            os.makedirs(os.path.dirname(full_path), exist_ok=True)
            with open(full_path, "wb") as f:
                f.write(file_data)
            logger.info(f"Saved {object_name} to local disk storage at {full_path}.")
            return True, "local", object_name
        except Exception as disk_err:
            logger.error(
                f"FATAL: Both MinIO and local disk storage failed for {object_name}: {disk_err}"
            )
            return False, "none", ""

    def get_bytes(self, object_name: str) -> Optional[bytes]:
        """Retrieves raw bytes from MinIO or local disk."""
        # 1. Check MinIO
        minio_client = self._get_minio_client()
        if minio_client is not None:
            try:
                response = minio_client.get_object(settings.MINIO_BUCKET, object_name)
                data = response.read()
                response.close()
                response.release_conn()
                return data
            except Exception as e:
                logger.debug(f"MinIO get_object failed ({e}); trying local disk.")

        # 2. Check Local Disk
        safe_rel_path = object_name.replace("/", os.sep).replace("\\", os.sep)
        if safe_rel_path.startswith(os.sep):
            safe_rel_path = safe_rel_path[1:]
        full_path = os.path.join(self.local_dir, safe_rel_path)
        if os.path.exists(full_path):
            try:
                with open(full_path, "rb") as f:
                    return f.read()
            except Exception as e:
                logger.error(f"Failed to read local storage file {full_path}: {e}")

        return None

    def get_download_url(self, object_name: str, document_id: Optional[str] = None) -> str:
        """
        Returns a signed URL for MinIO if online, or the API stream URL for local storage.
        """
        minio_client = self._get_minio_client()
        if minio_client is not None:
            try:
                from datetime import timedelta

                return minio_client.presigned_get_object(
                    settings.MINIO_BUCKET, object_name, expires=timedelta(hours=2)
                )
            except Exception:
                pass

        # Fallback to backend download endpoint
        if document_id:
            return f"{settings.API_V1_PREFIX}/documents/{document_id}/download"
        return f"{settings.API_V1_PREFIX}/documents/by-key/download?key={object_name}"


storage = StorageBackend()
