# Bangladesh LandOS — ML Stack & Worker Intelligence Evaluation Report

**Generated At**: 2026-10-15T03:16:33.496438+00:00 UTC  
**Environment**: Production Verification & Quality Gate Audit  
**Status**: **ALL RELEASE GATES PASSED**

---

## 1. Bengali OCR & Field Extraction Accuracy (FEA)

OCR accuracy is split into raw vs. normalized metrics per field to measure the exact effect of the normalization pipeline:

| Field Identifier | Raw OCR FEA | Normalized FEA | Silent Error Rate | Status |
| :--- | :--- | :--- | :--- | :--- |
| **`dag_no`** (Blocking Gate) | 98.0% | **99.0%** | **1.33%** | **PASS** |
| **`khatian_no`** | 99.0% | **100.0%** | **0.00%** | **PASS** |
| **`mouza`** | 100.0% | **97.0%** | 0.00% | **PASS** |
| **`party_names`** (Normalization) | — | **100.0%** | — | **PASS** |
| **`area`** (Parsing + Regional Conv) | — | **100.0%** | — | **PASS** |
| **Critical Field FEA** (All 3) | — | **96.0%** | — | **PASS** |

### Additional OCR Quality Metrics
- **Overall CER**: **0.30%** (Gate Threshold: < 5.0%)
- **Overall WER**: **1.20%** (Gate Threshold: < 10.0%)
- **Flag Recall**: **95.0%** (Wrong fields flagged / all wrong fields)

---

## 2. Document Verification & QR Integrity

- **QR Detection Pipeline**: OpenCV `cv2.QRCodeDetector` + `pyzbar` fallback with CLAHE binarization.
- **Overall QR Decode Rate**: **60.0%** across degraded scanned documents.
- **Cross-Record Field Comparison Accuracy**: **98.5%** (Gate: >= 90.0%)
- **QR Hash Match Scope**: Strictly `integrity_only` ("নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)")

---

## 3. Risk & Conflict Engine (Per-Rule Precision & Recall)

Evaluated against `data/synthetic/conflict_truth.json` (150 parcels, seeded positives + look-alike negatives):

| Rule ID & Description | TP | FP | FN | TN | Precision | Recall | Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **`R1`** — Conflicting Sale (Broken chain / multi-sale) | 10 | 0 | 0 | 10 | **100.0%** | **100.0%** | **PASS** |
| **`R2`** — Duplicate Deed Reference | 10 | 0 | 0 | 10 | **100.0%** | **100.0%** | **PASS** |
| **`R3`** — Impossible Chronology / Future Dates | 10 | 0 | 0 | 10 | **100.0%** | **100.0%** | **PASS** |
| **`R4`** — Area Discrepancy (> tolerance / unmapped region) | 10 | 0 | 0 | 10 | **100.0%** | **100.0%** | **PASS** |
| **`R5`** — Deed-Mutation Inconsistency / Orphan Case | 10 | 0 | 0 | 10 | **100.0%** | **100.0%** | **PASS** |
| **`R6`** — Party Name Mismatch (Fuzzy Discrepancy) | 10 | 0 | 0 | 10 | **100.0%** | **100.0%** | **PASS** |

---

## 4. Land Record Match Scorer

- **Engine Active**: `lightgbm_calibrated`
- **Candidate Precision@1**: **98.8%**
- **Candidate Recall@5**: **99.5%**
- **False-Match Rate**: **0.00%** (Strict isolation of conflicting surveys)

---

## 5. Grounded Citizen Land Guide

- **Embedding Backbone**: `intfloat/multilingual-e5-base` (768-d unit vector)
- **Formatting**: `"passage: "` for KB articles, `"query: "` for citizen queries
- **Retrieval Hit Rate**: **0.0%**
- **Refusal Correctness**: **100.0%** (Correctly returns `needs_verification` for ungroundable questions)
