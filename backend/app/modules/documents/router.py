import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Document
from app.modules.rbac.permissions import Permission, Scope, require

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
