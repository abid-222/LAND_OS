# Bengali Land Document OCR Benchmark Report

**Benchmark Sample Size**: 100 scanned cadastral Khatian documents with synthetic degradations (perspective warp, rotation, blur, shadow, JPEG artifacts).  
**Evaluation Standard**: Exact Character Error Rate (CER), Raw vs. Normalized Field Extraction Accuracy (FEA), Silent Error Rate, and Critical Field FEA.  
**Recommended Default Engine**: `paddleocr`

---

## 1. Primary Engine Comparison

| Metric | PaddleOCR (lang="bn") | Tesseract (ben+eng) | Delta (Paddle vs Tess) |
| :--- | :--- | :--- | :--- |
| **Critical Field FEA** (Dag + Khatian + Mouza) | **96.0%** | 84.0% | +12.0% |
| **Overall CER** (Levenshtein) | **0.30%** | 1.12% | -0.82% |
| **Silent Error Rate** (Dangerous unflagged errors) | **1.33%** | 4.00% | -2.67% |
| **Flag Recall** (Wrong fields flagged) | **0.0%** | 25.0% | +-25.0% |

---

## 2. Character Error Rate (CER) per Field

| Field Identifier | PaddleOCR CER | Tesseract CER |
| :--- | :--- | :--- |
| `dag_no` | **0.88%** | 1.99% |
| `khatian_no` | **0.26%** | 2.56% |
| `mouza` | **0.00%** | 0.00% |
| **Overall** | **0.30%** | 1.12% |

---

## 3. Raw vs. Normalized Field Extraction Accuracy (FEA)

Normalization transforms noisy OCR digit strings into canonical form (e.g. mapping Bangla numerals, repairing confusable O/0, stripping whitespace and danda separators).

| Field | Paddle Raw FEA | Paddle Normalized FEA | Tesseract Raw FEA | Tesseract Normalized FEA |
| :--- | :--- | :--- | :--- | :--- |
| `dag_no` | 98.0% | **99.0%** | 91.0% | 91.0% |
| `khatian_no` | 99.0% | **100.0%** | 93.0% | 96.0% |
| `mouza` | 100.0% | **97.0%** | 100.0% | 97.0% |

---

## 4. Top Digit-Level Confusions

Character swaps identified between visually similar Bengali numerals:

**PaddleOCR Top Swaps**:
{
  "০->O": 3,
  "৫->৬": 2
}

**Tesseract Top Swaps**:
{
  "৩->২": 12,
  "০->O": 4,
  "১->৭": 3
}

---

## 5. Performance Slices by Degradation & Font

### Degradation Slices (FEA)
| Degradation Condition | PaddleOCR FEA | Tesseract FEA |
| :--- | :--- | :--- |
| `blur` | **99.1%** | 94.9% |
| `rotation` | **98.7%** | 94.6% |
| `shadow` | **98.1%** | 95.1% |
| `perspective` | **98.3%** | 94.4% |
| `jpeg` | **98.5%** | 94.9% |

### Font Slices (FEA)
| Bangla Font | PaddleOCR FEA | Tesseract FEA |
| :--- | :--- | :--- |
| `HindSiliguri` | **0.0%** | 0.0% |
| `NotoSansBengali` | **0.0%** | 0.0% |
| `Nirmala` | **100.0%** | 93.8% |

---

## 6. Selection & Configuration Conclusion

- **Default Pick**: `PaddleOCR` (configured via `OCR_ENGINE=paddleocr`).
- **Rationale**: PaddleOCR demonstrates superior stroke segment identification on curved Bengali numerals (২, ৩, ৫, ৭) and conjunct characters, achieving higher critical-field FEA (96.0% vs 84.0%) and a lower silent error rate (1.33% vs 4.00%).
