"""
QR Code Detection and Parsing Engine for Bangladesh Land Documents.
Fallback pipeline:
1. Primary: cv2.QRCodeDetector()
2. Fallback: pyzbar.decode() (with image enhancement / CLAHE / threshold fallback)
Parses payload into: URL | reference id | JSON | unknown
"""

from dataclasses import dataclass
import json
import os
import re
from typing import Any, List, Literal, Optional, Tuple, Union
import cv2
import numpy as np

PayloadType = Literal["url", "reference_id", "json", "unknown"]

REF_ID_PATTERN = re.compile(
    r"^(?:khatian|dag|holding|case|rec|doc)[\-_/\:]+[a-zA-Z0-9\-_/]+$", re.IGNORECASE
)
URL_PATTERN = re.compile(
    r"^(?:https?|ftp)://[^\s/$.?#].[^\s]*$", re.IGNORECASE
)


@dataclass
class QrResult:
    text: Optional[str]
    payload_type: PayloadType
    parsed_payload: Any
    bbox: Optional[List[int]]  # [x, y, w, h] or [x1, y1, x2, y2]
    engine_used: Optional[str] # "cv2" | "pyzbar" | None
    success: bool


def parse_qr_payload(text: str) -> Tuple[PayloadType, Any]:
    """Classifies and parses the raw string payload from a QR code."""
    cleaned = text.strip()
    if not cleaned:
        return "unknown", None

    # 1. URL
    if URL_PATTERN.match(cleaned):
        return "url", cleaned

    # 2. JSON
    if (cleaned.startswith("{") and cleaned.endswith("}")) or (
        cleaned.startswith("[") and cleaned.endswith("]")
    ):
        try:
            parsed_json = json.loads(cleaned)
            return "json", parsed_json
        except Exception:
            pass

    # 3. Reference ID
    if REF_ID_PATTERN.match(cleaned) or (
        "/" in cleaned and not " " in cleaned and len(cleaned) < 80
    ):
        return "reference_id", cleaned

    return "unknown", cleaned


def detect_qr(
    image_input: Union[str, np.ndarray],
) -> QrResult:
    """
    Detects and decodes QR codes from land documents.
    Tries OpenCV QRCodeDetector first, then falls back to pyzbar on original,
    grayscale, and enhanced CLAHE images.
    """
    if isinstance(image_input, str):
        if not os.path.exists(image_input):
            return QrResult(
                text=None,
                payload_type="unknown",
                parsed_payload=None,
                bbox=None,
                engine_used=None,
                success=False,
            )
        img = cv2.imread(image_input)
    elif isinstance(image_input, np.ndarray):
        img = image_input
    else:
        return QrResult(
            text=None,
            payload_type="unknown",
            parsed_payload=None,
            bbox=None,
            engine_used=None,
            success=False,
        )

    if img is None:
        return QrResult(
            text=None,
            payload_type="unknown",
            parsed_payload=None,
            bbox=None,
            engine_used=None,
            success=False,
        )

    # Convert to gray
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    # 1. Try OpenCV QRCodeDetector
    try:
        detector = cv2.QRCodeDetector()
        retval, decoded_info, points, _ = detector.detectAndDecodeMulti(gray)
        if retval and decoded_info and any(decoded_info):
            for i, info in enumerate(decoded_info):
                if info:
                    bbox = None
                    if points is not None and len(points) > i:
                        pts = points[i].astype(int)
                        x1, y1 = np.min(pts, axis=0)
                        x2, y2 = np.max(pts, axis=0)
                        bbox = [int(x1), int(y1), int(x2), int(y2)]
                    ptype, parsed = parse_qr_payload(info)
                    return QrResult(
                        text=info,
                        payload_type=ptype,
                        parsed_payload=parsed,
                        bbox=bbox,
                        engine_used="cv2",
                        success=True,
                    )
        # Single decode fallback
        text, pts, _ = detector.detectAndDecode(gray)
        if text:
            bbox = None
            if pts is not None:
                pts_int = pts[0].astype(int)
                x1, y1 = np.min(pts_int, axis=0)
                x2, y2 = np.max(pts_int, axis=0)
                bbox = [int(x1), int(y1), int(x2), int(y2)]
            ptype, parsed = parse_qr_payload(text)
            return QrResult(
                text=text,
                payload_type=ptype,
                parsed_payload=parsed,
                bbox=bbox,
                engine_used="cv2",
                success=True,
            )
    except Exception:
        pass

    # 2. Fallback to pyzbar
    try:
        from pyzbar.pyzbar import decode as zbar_decode, ZBarSymbol  # type: ignore[import-untyped]

        # Try on gray, then on CLAHE enhanced
        candidates = [gray]
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8)).apply(gray)
        candidates.append(clahe)
        thresh = cv2.adaptiveThreshold(
            clahe, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 25, 10
        )
        candidates.append(thresh)

        for cand in candidates:
            barcodes = zbar_decode(cand, symbols=[ZBarSymbol.QRCODE])
            if barcodes:
                barcode = barcodes[0]
                text = barcode.data.decode("utf-8", errors="replace")
                rect = barcode.rect
                bbox = [rect.left, rect.top, rect.left + rect.width, rect.top + rect.height]
                ptype, parsed = parse_qr_payload(text)
                return QrResult(
                    text=text,
                    payload_type=ptype,
                    parsed_payload=parsed,
                    bbox=bbox,
                    engine_used="pyzbar",
                    success=True,
                )
    except Exception:
        pass

    return QrResult(
        text=None,
        payload_type="unknown",
        parsed_payload=None,
        bbox=None,
        engine_used=None,
        success=False,
    )
