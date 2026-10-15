# LandOS QR Code Hash & Document Integrity Specification

## 1. Overview & Disclaimer
This specification documents the cryptographic hash verification scheme utilized in **Bangladesh LandOS** for offline document integrity validation.

> [!IMPORTANT]
> **LEGAL NOTICE**:
> The QR code integrity check verifies only whether the optical text extracted from the physical document corresponds cryptographically to the signed or generated digital footprint (`scope="integrity_only"`).
> 
> **It DOES NOT constitute or verify legal ownership, title legitimacy, or freedom from encumbrance.**
> The official user-facing text displayed upon match is strictly:
> **"নথির তথ্য QR-এর সঙ্গে মিলেছে (মালিকানা যাচাই নয়)"** (Document content matches QR footprint — not ownership verification).
> Real-world national deployments must conform strictly to the official Ministry of Land / Directorate of Land Records and Surveys (DLRS) cryptographic payload specifications.

---

## 2. Canonical Demo Hash Structure
When a LandOS document carries a machine-readable QR payload containing a structured hash, the JSON payload follows this schema:

```json
{
  "doc_id": "DOC-2026-DH-004",
  "alg": "sha256",
  "hash": "a591a6d40bf420404a011733cfb7b190d62c65bf0bcda32b57b277d9ad9f146e",
  "issued_by": "Sub-Registry Office Tejgaon, Dhaka",
  "timestamp": "2026-10-15T00:00:00Z"
}
```

### Canonical Field Hash Generation
The hash is computed over canonical, sorted, normalized key-value pairs formatted as:
`field1=value1&field2=value2&...`

Key fields hashed in canonical sequence:
1. `area`: Normalized decimal representation (e.g. `33.0`)
2. `dag_no`: Canonical identifier (e.g. `1205/1`)
3. `document_no`: Canonical deed / porcha number (e.g. `4582`)
4. `khatian_no`: Canonical khatian number (e.g. `340`)
5. `mouza`: Normalized Mouza name (e.g. `তেজগাঁও`)

```python
import hashlib

canonical_str = "area=33.0&dag_no=1205/1&document_no=4582&khatian_no=340&mouza=তেজগাঁও"
expected_hash = hashlib.sha256(canonical_str.encode("utf-8")).hexdigest()
```

---

## 3. Database Audit Record
Verification results are recorded in the `qr_checks` table:
- `document_id`: UUID
- `payload_type`: `"json"` | `"hash"` | `"url"`
- `hash_alg`: `"sha256"`
- `hash_match`: `true` | `false`
- `scope`: `"integrity_only"`
- `checked_at`: Timestamp
