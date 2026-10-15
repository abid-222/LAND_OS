# Bangladesh LandOS — REST API Specification

**API Version**: `v1`  
**Base URL**: `/api/v1`  
**OpenAPI Documentation**: `http://localhost:8000/docs` (Swagger UI) / `http://localhost:8000/redoc` (ReDoc)  
**Security Schemes**: Bearer JWT (`Authorization: Bearer <token>`) & HttpOnly cookie (`landos_access_token`)  

---

## 1. Authentication & Identity (`/auth`)

### `POST /api/v1/auth/login`
Authenticates a user and issues JWT tokens and session cookies.
- **Request Body**:
  ```json
  {
    "email": "citizen@landos.gov.bd",
    "password": "Password123!"
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
      "email": "citizen@landos.gov.bd",
      "role": "Citizen",
      "full_name_bn": "নাগরিক ডেমো ব্যবহারকারী"
    }
  }
  ```

### `GET /api/v1/auth/me`
Retrieves currently authenticated user profile and permissions.
- **Headers**: `Authorization: Bearer <token>`
- **Response** (`200 OK`): Returns User identity, role, and assigned scopes (`OWN`, `OFFICE`, `REGION`, `GLOBAL`).

---

## 2. Document Intelligence & Scanning (`/documents`, `/scan`)

### `POST /api/v1/scan/qr`
Decodes QR codes from deed images, extracts embedded cryptographic hash, verifies structure, and falls back to OCR if unreadable.
- **Request**: Multipart form data with `file` (`image/jpeg`, `image/png`).
- **Response** (`200 OK`):
  ```json
  {
    "qr_detected": true,
    "qr_type": "land_record_v1",
    "extracted_fields": {
      "khatian_no": "৩৪০",
      "dag_no": "১২০৫",
      "mouza": "তেজগাঁও",
      "qr_hash": "a1b2c3d4..."
    },
    "epistemic_badge": "OCR_EXTRACTED",
    "integrity_verified": true,
    "scope_note": "নথির তথ্য QR-এর সঙ্গে যাচাই শুধুমাত্র অখণ্ডতার প্রমাণ (মালিকানা বা স্বত্ব যাচাই নয়)।"
  }
  ```

### `POST /api/v1/documents`
Ingests document deeds with magic-byte verification, Pillow re-encoding, MinIO storage, and asynchronous OCR enqueueing.
- **Headers**: `Authorization: Bearer <token>`
- **Request**: Multipart form data (`file`).
- **Response** (`200 OK`):
  ```json
  {
    "document_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "file_name": "dalil_scan.jpg",
    "file_size": 184520,
    "magic_bytes_verified": true,
    "re_encoded": true,
    "status": "queued",
    "status_label": "OCR_EXTRACTED"
  }
  ```

### `GET /api/v1/documents/{document_id}/extraction`
Returns extracted fields with confidence scores, anomaly flags, and epistemic status labels.
- **Response** (`200 OK`):
  ```json
  {
    "document_id": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
    "status_label": "OCR_EXTRACTED",
    "fields": [
      {
        "field_name": "dag_no",
        "raw_value": "১২০৫",
        "normalized_value": "১২০৫",
        "confidence": 0.96,
        "flagged": false
      },
      {
        "field_name": "area_acres",
        "raw_value": "০.৩৩ একর",
        "normalized_value": "0.33",
        "confidence": 0.94,
        "flagged": false
      }
    ]
  }
  ```

### `PATCH /api/v1/documents/{document_id}/fields`
Submits user corrections for OCR fields. Updates document status to `USER_CORRECTED` and records an immutable audit entry.
- **Request Body**:
  ```json
  {
    "fields": {
      "dag_no": "১২০৬"
    },
    "correction_reason": "OCR misread Bengali digit ৫ as ৬"
  }
  ```

### `POST /api/v1/documents/{document_id}/verify`
Compares extracted document fields against official LandRecord registers. Reports field-by-field match status without speculative fraud claims.

---

## 3. Land Record Search (`/search`, `/records`)

### `POST /api/v1/search`
Multi-identifier search engine combining B-Tree indexes and machine-learned scoring (`RandomForestClassifier`).
- **Request Body**:
  ```json
  {
    "dag_no": "১২০৫",
    "khatian_no": "৩৪০",
    "mouza": "তেজগাঁও",
    "limit": 10
  }
  ```
- **Response** (`200 OK`):
  ```json
  {
    "query": {"dag_no": "১২০৫", "khatian_no": "৩৪০"},
    "total_found": 1,
    "is_ambiguous": false,
    "candidates": [
      {
        "id": "e826b5c3-3058-4f81-8b01-5d911b3bcfe2",
        "record_no": "REC-TG-1205",
        "khatian_no": "৩৪০",
        "dag_no": "১২০৫",
        "mouza_name_bn": "তেজগাঁও",
        "owner_names_bn": "মো: রফিকুল ইসলাম",
        "area_acres": 0.33,
        "match_score": 0.985,
        "status_label": "VERIFIED_AUTHORIZED_SOURCE",
        "reasons": [
          "হাল দাগ নম্বর হুবহু মিলেছে (১২০৫)",
          "খতিয়ান নম্বর হুবহু মিলেছে (৩৪০)",
          "মৌজা তেজগাঁও সার্কেল নির্ভুলভাবে সনাক্ত"
        ]
      }
    ]
  }
  ```

---

## 4. Cadastral Spatial Maps (`/map/parcels`)

### `GET /api/v1/map/parcels?bbox={min_lon},{min_lat},{max_lon},{max_lat}`
Returns GeoJSON FeatureCollection of cadastral boundary polygons with `is_illustrative=true` metadata.
- **Response** (`200 OK`):
  ```json
  {
    "type": "FeatureCollection",
    "is_illustrative": true,
    "disclaimer": "নকশা ও সীমানা শুধুমাত্র নির্দেশক; এটি কোনো আইনি সীমানা নির্ধারণ নয়।",
    "features": [
      {
        "type": "Feature",
        "id": "P-4520",
        "geometry": {
          "type": "Polygon",
          "coordinates": [...]
        },
        "properties": {
          "parcel_id": "P-4520",
          "dag_no": "১২০৫",
          "area_decimal": 15.5,
          "has_active_conflict": false
        }
      }
    ]
  }
  ```

---

## 5. Risk & Conflict Alerts (`/parcels/{id}/alerts`)

### `GET /api/v1/parcels/{parcel_id}/alerts`
Retrieves deterministic conflict alerts generated by the 6 core land conflict rules:
1. `RULE-1: OVER_TRANSACTION_AREA` (Sold area exceeds registered khatian entitlement)
2. `RULE-2: DUPLICATE_ACTIVE_DEED` (Concurrent conflicting transfers on same dag)
3. `RULE-3: UNRESOLVED_DISPUTE_MUTATION` (Pending civil lawsuit or AC Land dispute)
4. `RULE-4: SATELLITE_BOUNDARY_OVERLAP` (Spatial footprint discrepancy)
5. `RULE-5: VESTED_GOVT_LAND_INTERSECTION` (Khas, railway, or waqf property clash)
6. `RULE-6: CHAIN_OF_TITLE_DISCONTINUITY` (Missing intermediate deed/mutation link)

Every alert includes evidence items, reason statements, and links to verified knowledge articles.

---

## 6. Buyer Due Diligence Report (`/buyer-reports`)

### `POST /api/v1/parcels/{parcel_id}/buyer-report`
Generates a structured 5-section Buyer Risk Report.
- **Mandatory Sections**:
  1. `Record Ownership & Cadastral Overview`
  2. `Chain of Title & Historical Mutations`
  3. `Active Encumbrances & Identified Conflicts`
  4. `Recommended Next Steps & Verification Checklist`
  5. `Mandatory Legal & Epistemic Disclaimer`
- **Epistemic Constraint**: Strictly neutral language; zero speculative "safe"/"unsafe" ratings.

---

## 7. Accuracy & Reliability Lab (`/quality`)

### `GET /api/v1/quality/summary`
Returns automated evaluations across OCR and parsing engines:
- Character Error Rate (`CER`) and Field Extraction Accuracy (`FEA`) per field (`dag_no`, `khatian_no`, `mouza`).
- Critical-field FEA.
- Silent error rate and flag recall.
- Bengali digit confusion matrix.

### `POST /api/v1/quality/run-eval`
Triggers an on-demand evaluation run over test datasets (`Tech Admin` role required).

---

## 8. Audit & Chain of Custody (`/admin/audit`)

### `GET /api/v1/admin/audit/verify-chain`
Verifies the cryptographic SHA-256 hash chain of the system audit log, ensuring complete immutability.
