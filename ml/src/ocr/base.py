"""
Bangla OCR Engine Base Interface and Token Definition.
"""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from typing import List, Optional, Union
import numpy as np


@dataclass
class Token:
    text: str
    bbox: List[int]  # [x1, y1, x2, y2]
    conf: float

    def to_dict(self):
        return {
            "text": self.text,
            "bbox": self.bbox,
            "conf": self.conf,
        }


class OcrEngine(ABC):
    """Abstract interface for document OCR engines."""

    @abstractmethod
    def read(self, image: Union[str, np.ndarray]) -> List[Token]:
        """
        Runs OCR on the given image.
        Returns a list of Token(text, bbox, conf).
        """
        pass
