# Bangladesh LandOS — Limitations, Scope, and Legal Disclaimers

**Document Version**: 1.0.0  
**Effective Date**: 2026-10-15  
**Applicability**: All users, developers, evaluators, and institutional reviewers  

---

## 1. Synthetic Data Notice

### 1.1 Nature of the Data
All land records, khatian documents, deeds (দলিল), mouza boundaries, parcel polygons, citizen names, and mobile numbers utilized in this demonstration and evaluation environment are **entirely synthetic** or simulated.
- Records were algorithmically synthesized via `data/synthetic/generator.py` and `data/synthetic/generate_records.py`.
- Any similarity to real individuals, living or deceased, or actual ongoing litigation over specific parcels in Bangladesh is purely coincidental.
- Optical Character Recognition (OCR) test sets and scan artifacts simulate authentic field conditions (folds, stains, varying scanner resolutions, non-standard Bengali fonts, and stamp distortions) for rigorous benchmarking.

### 1.2 Training & Evaluation Datasets
Machine learning models (including candidate record matching and OCR normalization pipelines) are calibrated against synthetic ground truth (`data/synthetic/conflict_truth.json` and `data/normalize_cases.json`). Performance metrics reported in the Accuracy and Reliability Lab reflect evaluation on these curated benchmarks.

---

## 2. No Official Government Integration

### 2.1 Absence of Live Network Integration
Bangladesh LandOS is an independent software research and demonstration platform.
- **No Direct Connection**: The platform does **NOT** interface with, query, update, or transmit data to the production servers or private networks of:
  - The Ministry of Land (ভূমি মন্ত্রণালয়).
  - The Directorate of Land Records and Survey (DLRS).
  - The National Land Record System (e-Khatian / mutation / e-Namjari portals).
  - The Directorate of Registration (আইন ও বিচার বিভাগ / সাব-রেজিস্ট্রি অফিস).
- **No Official Issuance**: The application cannot issue officially recognized digital khatians, non-encumbrance certificates (NEC), mutation orders (ডি সি আর / খতিয়ান), or certified survey maps.

---

## 3. Mandatory Legal & Non-Advisory Disclaimer

### 3.1 Informational Purpose Only
The information, document intelligence extractions, cadastral overlays, conflict detections, and buyer due diligence reports provided by LandOS are for **informational, educational, and assistive purposes only**.

### 3.2 Not Legal Advice (আইনি পরামর্শ নয়)
- LandOS is **not a law firm, licensed land survey authority, or government land tribunal**.
- Nothing contained in this application, generated reports, or automated responses from the Citizen Guide chatbot constitutes legal counsel, title insurance, an official encumbrance guarantee, or binding dispute adjudication.
- Property buyers, sellers, and financial institutions **must independently verify** land titles, mutations, tax receipts (দাখিলা), and physical boundaries through authorized AC Land offices, Sub-Registry offices, and qualified legal practitioners before executing financial transactions or registering deeds.

### 3.3 Illustrative Map Boundaries
All cadastral map boundaries and parcel visualizations provided by the application are flagged with `is_illustrative: true`:
> **আইনি বিজ্ঞপ্তি**: মানচিত্রের সীমানা শুধুমাত্র ধারণাগত ও নির্দেশক। এটি ডিজিটাল আমিন বা সার্ভেয়ার দ্বারা পরিমাপকৃত আইনি সীমানা নির্ধারণ নয়।

---

## 4. Epistemic Integrity Framework & Limitations

To prevent misinterpretation and guard against hallucination, LandOS operates under strict epistemic integrity principles:

1. **Explicit Data Provenance**:
   Every displayed data point is annotated with its exact provenance:
   - `OCR_EXTRACTED`: Extracted via optical model; unverified by human operator.
   - `POSSIBLE_MATCH`: Statistical candidate score; requires user confirmation.
   - `USER_CORRECTED`: Modified by human operator; audit trail maintained.
   - `VERIFICATION_REQUIRED`: Discrepancy or low-confidence threshold detected.
   - `VERIFIED_AUTHORIZED_SOURCE`: Strictly reserved for records matching established baseline registers.

2. **Scoped QR Verification**:
   QR code verification proves **cryptographic file integrity only** (confirming that document text has not been altered relative to the encoded hash). It does **NOT** certify authenticity of ownership, legitimacy of possession, or freedom from unrecorded litigation.

3. **Neutral Discrepancy Reporting**:
   Missing fields or hash mismatches are reported factually as discrepancies (`মেলেনি / অসঙ্গতি`), **never** as defamatory assertions of fraudulent intent or criminal counterfeiting.
