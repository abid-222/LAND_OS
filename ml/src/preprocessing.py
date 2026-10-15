"""
Document Preprocessing Pipeline using OpenCV for Bangladesh Land Documents.
Performs:
1. Grayscale conversion
2. Perspective correction and deskewing
3. Edge-preserving denoising
4. CLAHE contrast enhancement and adaptive Gaussian thresholding
5. High-resolution aspect-ratio preserving resize (1600px long side)
"""

from dataclasses import dataclass
import os
from typing import Optional, Tuple, Union
import cv2
import numpy as np


@dataclass
class PreprocessedResult:
    image: np.ndarray              # Enhanced grayscale / CLAHE image
    binary_image: np.ndarray       # Adaptive thresholded binary image
    deskew_angle: float            # Estimated skew angle in degrees
    original_shape: Tuple[int, int] # (height, width) before resize
    final_shape: Tuple[int, int]    # (height, width) after resize (long side = 1600)
    perspective_corrected: bool


def detect_skew_angle(gray: np.ndarray) -> float:
    """Estimates skew angle of a scanned document in degrees using minAreaRect on edges."""
    try:
        # Edge detection
        blur = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blur, 50, 150, apertureSize=3)
        pts = cv2.findNonZero(edges)
        if pts is None or len(pts) < 100:
            return 0.0

        rect = cv2.minAreaRect(pts)
        angle = rect[-1]

        # OpenCV minAreaRect returns angles in [-90, 0)
        if angle < -45:
            angle = -(90 + angle)
        elif angle > 45:
            angle = 90 - angle
        else:
            angle = -angle

        # Cap angle to realistic scan skew range [-20, 20]
        if abs(angle) > 25.0:
            return 0.0
        return float(angle)
    except Exception:
        return 0.0


def rotate_image(image: np.ndarray, angle: float, bg_color: int = 255) -> np.ndarray:
    """Rotates image around center by given angle preserving dimensions."""
    if abs(angle) < 0.2:
        return image
    h, w = image.shape[:2]
    center = (w // 2, h // 2)
    m = cv2.getRotationMatrix2D(center, angle, 1.0)
    rotated = cv2.warpAffine(
        image, m, (w, h), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=bg_color
    )
    return rotated


def detect_and_warp_quad(image: np.ndarray) -> Tuple[np.ndarray, bool]:
    """
    Detects rectangular document boundary / 4 corners and corrects perspective.
    Falls back to original if no confident 4-point quadrilateral contour is found.
    """
    try:
        h, w = image.shape[:2]
        blur = cv2.GaussianBlur(image, (7, 7), 0)
        thresh = cv2.adaptiveThreshold(
            blur, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY_INV, 15, 5
        )

        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        if not contours:
            return image, False

        # Find largest contour by area
        contours = sorted(contours, key=cv2.contourArea, reverse=True)
        img_area = w * h

        for cnt in contours[:5]:
            area = cv2.contourArea(cnt)
            # Must occupy at least 30% of total image area
            if area < 0.30 * img_area:
                continue

            peri = cv2.arcLength(cnt, True)
            approx = cv2.approxPolyDP(cnt, 0.02 * peri, True)

            if len(approx) == 4:
                # 4-point perspective transform
                pts = approx.reshape(4, 2).astype("float32")
                # Order points: top-left, top-right, bottom-right, bottom-left
                s = pts.sum(axis=1)
                tl = pts[np.argmin(s)]
                br = pts[np.argmax(s)]
                diff = np.diff(pts, axis=1)
                tr = pts[np.argmin(diff)]
                bl = pts[np.argmax(diff)]

                src = np.array([tl, tr, br, bl], dtype="float32")
                # Compute width and height of new image
                width_a = np.linalg.norm(br - bl)
                width_b = np.linalg.norm(tr - tl)
                max_w = max(int(width_a), int(width_b))

                height_a = np.linalg.norm(tr - br)
                height_b = np.linalg.norm(tl - bl)
                max_h = max(int(height_a), int(height_b))

                if max_w > 100 and max_h > 100:
                    dst = np.array(
                        [[0, 0], [max_w - 1, 0], [max_w - 1, max_h - 1], [0, max_h - 1]],
                        dtype="float32",
                    )
                    m = cv2.getPerspectiveTransform(src, dst)
                    warped = cv2.warpPerspective(image, m, (max_w, max_h), flags=cv2.INTER_LINEAR)
                    return warped, True
    except Exception:
        pass
    return image, False


def resize_long_side(image: np.ndarray, target_long_side: int = 1600) -> np.ndarray:
    """Resizes image such that max(height, width) == target_long_side, preserving aspect ratio."""
    h, w = image.shape[:2]
    long_side = max(h, w)
    if long_side == target_long_side or long_side == 0:
        return image

    scale = target_long_side / float(long_side)
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    interp = cv2.INTER_AREA if scale < 1.0 else cv2.INTER_CUBIC
    return cv2.resize(image, (new_w, new_h), interpolation=interp)


def preprocess_document(
    input_source: Union[str, np.ndarray],
    target_long_side: int = 1600,
    enable_perspective: bool = True,
    enable_deskew: bool = True,
) -> PreprocessedResult:
    """
    Executes the standard OpenCV preprocessing pipeline:
    1. Grayscale
    2. Perspective / Deskew
    3. Denoise (Bilateral filter)
    4. CLAHE contrast enhancement & Adaptive thresholding
    5. Resize to target_long_side (1600px)
    """
    if isinstance(input_source, str):
        if not os.path.exists(input_source):
            raise FileNotFoundError(f"Document image file not found: {input_source}")
        img = cv2.imread(input_source)
        if img is None:
            raise ValueError(f"OpenCV failed to read image at: {input_source}")
    elif isinstance(input_source, np.ndarray):
        img = input_source.copy()
    else:
        raise TypeError(f"Unsupported input type for preprocessing: {type(input_source)}")

    orig_h, orig_w = img.shape[:2]

    # 1. Grayscale conversion
    if len(img.shape) == 3:
        if img.shape[2] == 4:
            gray = cv2.cvtColor(img, cv2.COLOR_BGRA2GRAY)
        else:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img.copy()

    # 2. Perspective & Deskew
    perspective_done = False
    if enable_perspective:
        gray, perspective_done = detect_and_warp_quad(gray)

    skew_angle = 0.0
    if enable_deskew:
        skew_angle = detect_skew_angle(gray)
        if abs(skew_angle) >= 0.3:
            gray = rotate_image(gray, skew_angle, bg_color=255)

    # 3. Denoise (Bilateral filter preserves sharp Bengali character strokes while removing paper noise)
    denoised = cv2.bilateralFilter(gray, d=7, sigmaColor=50, sigmaSpace=50)

    # 4. CLAHE contrast enhancement
    clahe = cv2.createCLAHE(clipLimit=2.5, tileGridSize=(8, 8))
    enhanced = clahe.apply(denoised)

    # Adaptive Gaussian thresholding for binarized output
    binary = cv2.adaptiveThreshold(
        enhanced, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 21, 10
    )

    # 5. Resize to 1600px long side
    resized_enhanced = resize_long_side(enhanced, target_long_side=target_long_side)
    resized_binary = resize_long_side(binary, target_long_side=target_long_side)

    final_h, final_w = resized_enhanced.shape[:2]

    return PreprocessedResult(
        image=resized_enhanced,
        binary_image=resized_binary,
        deskew_angle=round(skew_angle, 2),
        original_shape=(orig_h, orig_w),
        final_shape=(final_h, final_w),
        perspective_corrected=perspective_done,
    )
