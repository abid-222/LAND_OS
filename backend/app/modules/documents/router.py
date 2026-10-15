import asyncio
import json
import logging
import os
import uuid

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, File, HTTPException, Request, UploadFile, status
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Document
from app.modules.rbac.permissions import Permission, Scope, require

logger = logging.getLogger("landos.documents.router")
router = APIRouter(prefix="/documents", tags=["Document Scanning & OCR"])


@router.get("", summary="List ingested documents")
async def list_documents(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.DOCUMENT_READ, Scope.OWN)),
):
    stmt = select(Document).order_by(Document.created_at.desc()).limit(50)
    result = await db.execute(stmt)
    return result.scalars().all()


@router.post("/upload", summary="Upload deed or khatian scan with magic-byte validation")
async def upload_document(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.DOCUMENT_UPLOAD, Scope.OWN)),
):
    header = await file.read(4)
    await file.seek(0)

    # Magic byte check for PDF, JPEG, PNG
    is_pdf = header.startswith(b"%PDF")
    is_jpeg = header.startswith(b"\xff\xd8\xff")
    is_png = header.startswith(b"\x89PNG")

    if not (is_pdf or is_jpeg or is_png):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only verified PDF, JPEG, and PNG deed documents are permitted.",
        )

    doc_id = uuid.uuid4()
    doc = Document(
        id=doc_id,
        file_name=file.filename or f"scan_{doc_id}.jpg",
        file_key=f"uploads/{doc_id}_{file.filename}",
        mime_type=file.content_type or "image/jpeg",
        file_size=0,
        magic_bytes_verified=True,
        upload_status="PENDING",
        uploader_id=current_user.id,
    )
    db.add(doc)
    await db.commit()
    await db.refresh(doc)

    return {
        "status": "uploaded",
        "document_id": str(doc.id),
        "file_name": doc.file_name,
        "magic_bytes_verified": True,
        "trust_status": "OCR_EXTRACTED",
    }


@router.get("/{document_id}/events", summary="Stream real-time document processing progress via SSE")
async def document_progress_events(
    document_id: str,
    request: Request,
    current_user=Depends(require(Permission.DOCUMENT_READ, Scope.OWN)),
):
    """
    Server-Sent Events endpoint streaming real-time pipeline progress
    published by background workers to `document:progress:{document_id}`.
    """
    redis_url = os.getenv("REDIS_URL", "redis://localhost:6379/0")

    async def event_generator():
        channel_name = f"document:progress:{document_id}"
        r = None
        pubsub = None
        try:
            r = aioredis.from_url(redis_url, socket_connect_timeout=2)
            pubsub = r.pubsub()
            await pubsub.subscribe(channel_name)

            # Initial connection handshake event
            init_data = json.dumps({"document_id": document_id, "stage": "connected", "percent": 0})
            yield f"event: connected\ndata: {init_data}\n\n"

            idle_ticks = 0
            while True:
                if await request.is_disconnected():
                    break

                try:
                    message = await pubsub.get_message(ignore_subscribe_messages=True, timeout=1.0)
                except Exception:
                    message = None

                if message and message.get("type") == "message":
                    idle_ticks = 0
                    raw_data = message["data"]
                    data_str = raw_data.decode("utf-8") if isinstance(raw_data, bytes) else str(raw_data)
                    yield f"data: {data_str}\n\n"

                    try:
                        parsed = json.loads(data_str)
                        if parsed.get("stage") in ("completed", "failed"):
                            break
                    except Exception:
                        pass
                else:
                    idle_ticks += 1
                    # Send periodic keep-alive comment every ~10s
                    if idle_ticks >= 10:
                        yield ": keep-alive\n\n"
                        idle_ticks = 0

                await asyncio.sleep(0.1)

        except Exception as e:
            logger.warning(f"SSE Redis pub/sub error for {document_id}: {e}")
            err_data = json.dumps({"document_id": document_id, "stage": "error", "message": str(e)})
            yield f"event: error\ndata: {err_data}\n\n"
        finally:
            if pubsub:
                try:
                    await pubsub.unsubscribe(channel_name)
                    await pubsub.close()
                except Exception:
                    pass
            if r:
                try:
                    await r.close()
                except Exception:
                    pass

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )

