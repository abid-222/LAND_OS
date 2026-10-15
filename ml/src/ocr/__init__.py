"""
OCR Engine Package with Config Switch.
Switch via env OCR_ENGINE: 'paddleocr' | 'tesseract' (default: paddleocr)
"""

import os
from ml.src.ocr.base import OcrEngine, Token
from ml.src.ocr.tesseract_engine import TesseractOcrEngine
from ml.src.ocr.paddle_engine import PaddleOcrEngine


def get_ocr_engine(engine_name: str = None) -> OcrEngine:
    if engine_name is None:
        engine_name = os.getenv("OCR_ENGINE", "paddleocr").lower().strip()

    if "paddle" in engine_name:
        return PaddleOcrEngine(lang="bn")
    elif "tesseract" in engine_name:
        return TesseractOcrEngine(lang="ben+eng")
    else:
        # Default to paddleocr as it demonstrates superior accuracy on complex Bengali script
        return PaddleOcrEngine(lang="bn")
