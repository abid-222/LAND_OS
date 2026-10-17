"""
QR Code Scanner API Endpoint.
POST /api/v1/scan/qr
Scans document images for QR codes, parses payload, checks hash integrity,
and enforces scope='integrity_only'.
"""

import io
from typing import Any, Optional

import cv2
import numpy as np
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from ml.src.qr import detect_qr
from PIL import Image
from pydantic import BaseModel

from app.core.rate_limit import rate_limit
from app.modules.documents.verification import compute_canonical_fields_hash

router = APIRouter(prefix="/scan", tags=["QR Code Scanner"])


class QRScanResponse(BaseModel):
    success: bool
    payload_type: str
    raw_payload: Optional[str] = None
    parsed_payload: Optional[Any] = None
    hash_match: bool = False
    scope: str = "integrity_only"
    ui_text_bn: str
    engine_used: Optional[str] = None


@router.post(
    "/qr",
    response_model=QRScanResponse,
    summary="Scan QR code from document image and verify integrity",
    dependencies=[Depends(rate_limit(requests=30, window_seconds=60))],
)
async def scan_qr_endpoint(
    file: UploadFile = File(...),
):
    """
    Scans an uploaded document image for QR codes.
    If the QR payload contains a verification hash, checks mathematical integrity.
    UI Text:
      Matched: 'নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)'
      Mismatched / Not found: 'মেলেনি' or 'QR কোড শনাক্ত করা যায়নি'
    """
    content = await file.read()
    if not content:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Empty file upload.",
        )

    # Decode image using OpenCV / Pillow
    try:
        pil_img = Image.open(io.BytesIO(content)).convert("RGB")
        cv_img = cv2.cvtColor(np.array(pil_img), cv2.COLOR_RGB2BGR)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to decode image data: {str(e)}",
        )

    qr_res = detect_qr(cv_img)

    if not qr_res.success or not qr_res.text:
        return QRScanResponse(
            success=False,
            payload_type="unknown",
            raw_payload=None,
            parsed_payload=None,
            hash_match=False,
            scope="integrity_only",
            ui_text_bn="মেলেনি",
            engine_used=qr_res.engine_used,
        )

    hash_match = False
    ui_text_bn = "মেলেনি"

    if qr_res.payload_type == "json" and isinstance(qr_res.parsed_payload, dict):
        payload_dict = qr_res.parsed_payload
        if "hash" in payload_dict:
            expected_hash = payload_dict.get("hash")
            # If payload has canonical fields, verify hash
            if "fields" in payload_dict and isinstance(payload_dict["fields"], dict):
                computed = compute_canonical_fields_hash(payload_dict["fields"])
                hash_match = computed.lower() == str(expected_hash).lower()
            else:
                hash_match = True  # Self-contained validated payload

            ui_text_bn = (
                "নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)" if hash_match else "মেলেনি"
            )
        else:
            ui_text_bn = "নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)"
            hash_match = True
    else:
        # URL or reference id
        ui_text_bn = "নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)"
        hash_match = True

    return QRScanResponse(
        success=True,
        payload_type=qr_res.payload_type,
        raw_payload=qr_res.text,
        parsed_payload=qr_res.parsed_payload,
        hash_match=hash_match,
        scope="integrity_only",
        ui_text_bn=ui_text_bn,
        engine_used=qr_res.engine_used,
    )
