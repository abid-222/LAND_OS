# Bangladesh LandOS — 5-Minute Executive Walkthrough Demo Script

**Target Audience**: Government Stakeholders, Civil Service Evaluators, Technical Architects, Donors  
**Demo Duration**: Exactly 5 Minutes (300 Seconds)  
**System Credentials**: See [Demo Accounts](#demo-accounts) below  
**Prerequisites**: Application running locally (`localhost:5173` frontend, `localhost:8000` backend)  

---

## Demo Accounts

All accounts are pre-seeded for dev/demo with password: `Password123!`

| Role | Email | Password | Primary Scope | Key Demo Screen |
| :--- | :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@landos.gov.bd` | `Password123!` | Public / Own | Scan-to-Search, Citizen Guide |
| **Operator** | `operator@landos.gov.bd` | `Password123!` | Union Land Office | Document Intake, Normalization |
| **Reviewer** | `reviewer@landos.gov.bd` | `Password123!` | AC Land Office | HITL Review Queue |
| **Supervisor** | `supervisor@landos.gov.bd` | `Password123!` | Circle AC Land | Risk Approvals & Overrides |
| **Tech Admin** | `techadmin@landos.gov.bd` | `Password123!` | National | Accuracy & Reliability Lab |

---

## Detailed Minute-by-Minute Walkthrough

### [00:00 – 00:30] Introduction & The Core Problem
- **Narrator**:
  > *"Welcome to Bangladesh LandOS. Today, citizens and land officers across Bangladesh face rampant land boundary disputes, fraudulent deed claims, and multi-week mutation delays. LandOS introduces an epistemic-first, AI-assisted land intelligence platform designed specifically for Bangladesh's unique land administration reality—supporting Bengali OCR, cadastral mapping, conflict detection, and transparent audit trails."*
- **Visual**: Show the Landing Page (`/`). Highlight the clean bilingual interface (English / বাংলা) and the security status indicator.

---

### [00:30 – 01:30] Feature 1: Smart Scan-to-Search & Bangla OCR Normalization
- **Narrator**:
  > *"Let's begin with a citizen receiving an unfamiliar deed document. They simply upload a photo or scan. Watch how our Smart Scan-to-Search prioritizes cryptographic QR verification first."*
- **Action**:
  1. Navigate to `/scan`.
  2. Upload a sample deed image (`data/synthetic/documents/deed_demo_01.jpg` or any deed image).
  3. Observe immediate QR code detection and field extraction.
- **Narrator**:
  > *"Notice how the system handles Bengali numerals: '১২০৫' and '৩৪০' are normalized instantaneously. Look at the trust badges: LandOS explicitly tags extracted data as `OCR_EXTRACTED` with a clear confidence score. If an extraction is ambiguous, it is highlighted in amber—the system never presents optical extraction as an absolute fact. With one tap, we click 'Search from Extracted Fields'."*

---

### [01:30 – 02:30] Feature 2: Explainable Record Matching & Cadastral Map
- **Narrator**:
  > *"Now we transition directly into Record Matching. Instead of a black-box probability, LandOS provides complete explainability."*
- **Action**:
  1. Click **Search** (`/search`).
  2. The system retrieves candidate matching Khatians (e.g., Khatian `৩৪০`, Dag `১২০৫`, Mouza `Tejgaon`).
  3. Expand the top candidate.
- **Narrator**:
  > *"Notice the itemized score breakdown: Dag matched exactly (+40%), Khatian matched (+30%), Mouza verified (+25%). When multiple candidates have near-equal probability, LandOS marks the result as 'Ambiguous' and prompts the user to verify rather than silently guessing."*
- **Action**:
  4. Click **View Cadastral Map** (`/map`).
  5. The interactive map renders parcel `P-4520` in Tejgaon with GIS parcel boundaries.
  6. Point out the clear badge: `is_illustrative: true` — reinforcing that digital maps assist but do not replace legal physical surveys.

---

### [02:30 – 03:30] Feature 3: Risk & Conflict Engine (6 Deterministic Rules)
- **Narrator**:
  > *"Now let's examine the heart of citizen protection: the Risk & Conflict Engine. In Bangladesh, over-selling land and duplicate deed transfers are major sources of litigation."*
- **Action**:
  1. Select parcel `P-4520` or visit `/parcels/P-4520/alerts`.
  2. Show the active alerts:
     - **Alert 1**: `RULE-1: OVER_TRANSACTION_AREA` (Sold 0.45 acres when registered share is 0.33 acres).
     - **Alert 2**: `RULE-6: CHAIN_OF_TITLE_DISCONTINUITY` (Missing intermediate mutation link from 2018).
- **Narrator**:
  > *"Every single alert cites hard evidence: the registered volume, page number, and the specific discrepancy. Each alert directly links to an authoritative Knowledge Base circular from the Ministry of Land."*

---

### [03:30 – 04:15] Feature 4: Buyer Due Diligence Report & Citizen Guide
- **Narrator**:
  > *"Before buying land, a citizen can generate a comprehensive Buyer Risk Report."*
- **Action**:
  1. Navigate to `/buyer-report`.
  2. Click **Generate Buyer Due Diligence Report**.
- **Narrator**:
  > *"Notice the report structure: 1) Cadastral Overview, 2) Chain of Title, 3) Active Encumbrances, 4) Recommended Next Steps, and 5) Mandatory Legal Disclaimer. Notice the epistemic neutrality: nowhere does the system make speculative claims like 'Safe to Buy' or '100% Verified'. Instead, it equips the citizen with an actionable checklist to take to the AC Land Office."*
- **Action**:
  3. Open the **Citizen Guide Chatbot** (`/guide`).
  4. Type: *"কীভাবে নামজারি আবেদন করব?"* (How do I apply for mutation?)
  5. The AI responds strictly grounded in official circulars from `data/kb/`, with direct citations.

---

### [04:15 – 05:00] Feature 5: Accuracy & Reliability Lab (Admin View)
- **Narrator**:
  > *"Finally, let's log in as Tech Admin to inspect system health and AI governance."*
- **Action**:
  1. Log in as `techadmin@landos.gov.bd`.
  2. Navigate to **Accuracy & Reliability Lab** (`/quality`).
- **Narrator**:
  > *"Here, management and auditors monitor AI quality in real time: Character Error Rate (CER), Field Extraction Accuracy (FEA) separated per critical field (dag, khatian, mouza), silent error rate, and our Bengali digit confusion matrix. If any gate fails—for example if Dag FEA drops below 95%—the dashboard flags it in red and halts automated ingestion into production registers."*
- **Action**:
  3. Show the green status on all quality gates.
- **Narrator**:
  > *"Bangladesh LandOS brings transparency, cryptographic integrity, and explainability to land administration. Thank you."*
