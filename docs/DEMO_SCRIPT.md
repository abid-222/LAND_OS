# Bangladesh LandOS — 5-Minute Hackathon Demo Script & Track Showcase

**Target Audience**: Hackathon Judges, Civil Service Evaluators, Technical Architects, Ministry Stakeholders  
**Demo Duration**: Exactly 5 Minutes (300 Seconds)  
**System Credentials**: Pre-seeded demo accounts (Password: `Password123!`)  
**Reset Command**: `python scripts/demo_reset.py` (Resets SQLite DB to baseline with all demo scenarios)  
**Live Development URLs**:  
- Frontend: `http://localhost:5173`  
- Backend API Docs: `http://127.0.0.1:8000/docs`  

---

## 1. Demo Accounts & RBAC Roles

All accounts are pre-seeded in the database with password: `Password123!`

| Role | Email | Scope | Primary Demonstration Screen |
| :--- | :--- | :--- | :--- |
| **Citizen** | `citizen@landos.gov.bd` | Public / Own Parcels | Pre-Purchase Check, E-Namjari, Voice Assistant, Parcel Watch |
| **Operator** | `operator@landos.gov.bd` | Union Land Office | Document Intake, Normalization, Application Submission |
| **Reviewer** | `reviewer@landos.gov.bd` | Upazila AC Land Office | E-Namjari HITL Review & Hearing Verification |
| **Supervisor** | `supervisor@landos.gov.bd` | Circle AC Land Officer | Final E-Namjari Approval & Khatian Sign-Off |
| **Tech Admin** | `techadmin@landos.gov.bd` | Sovereign National | AI Accuracy Lab, Model Monitoring, Quality Gates |

> [!NOTE]
> Use the **Role Switcher Terminal** (floating key icon at bottom right of the UI) to switch roles instantly with one click during live presentations without logging out manually.

---

## 2. Key Demo Parcels & Data Reference

| Scenario | Identifier | Key Characteristics & Expected Behavior |
| :--- | :--- | :--- |
| **Clean Land (P5 Demo)** | `P-CLEAN-01` | All 6 pre-purchase indicators green (No khas, no acquisition, no litigation). Ready for due diligence report print/export. |
| **Govt Khas Land (P5 Demo)** | `P-KHAS-01` | **Red Flag**: Rule R7 triggers. Land belongs to Ministry of Land (Khas Register 1). Buying prohibited by law. |
| **Litigation Injunction (P5 Demo)** | `P-LIT-01` | **Amber Flag**: Rule R9 triggers. Active stay order from Dhaka High Court Division (Civil Revision No. 4521/2023). |
| **Concurrent Double Sale (P3 Demo)** | `P-4520` | **High Risk**: Rule R1 triggers. Deed D-2023-8891 and Deed D-2023-8892 sold 15.5 decimals twice in the same week. |
| **Active Namjari Workflow (P4 Demo)** | `NJ-2026-1001` | E-Namjari application: Passed auto-verification, reviewed by Reviewer, ready for Supervisor final sign-off. |
| **Rejected Namjari (P4 Demo)** | `NJ-2026-1004` | E-Namjari application: Auto-verification failed on Rule R1 (Double Sale detected); rejected by AC Land. |

---

## 3. Minute-by-Minute Hackathon Presentation Flow

```
  [00:00 - 00:45] Track P1 & P2: Bengali OCR & Cryptographic QR Verification
         │
  [00:45 - 01:45] Track P3: Deterministic Conflict Engine & Double-Sale Detection (P-4520)
         │
  [01:45 - 02:45] Track P5: Citizen Pre-Purchase Due Diligence (P-CLEAN-01 vs P-KHAS-01)
         │
  [02:45 - 03:45] Track P4: Smart E-Namjari Auto-Verification & Role Progression
         │
  [03:45 - 04:30] Track P6: Parcel Guardian Watch & Bengali Voice Assistant
         │
  [04:30 - 05:00] Epistemic Governance, Accuracy Lab & Sovereign Hand-Off
```

---

### [00:00 – 00:45] P1 & P2: Bengali Document Ingestion, OCR & Cryptographic QR

- **Opening Hook**:
  > *"Every year in Bangladesh, thousands of citizens lose life savings to altered paper deeds and forged registration seals. Bangladesh LandOS solves this with on-device AI and cryptographic provenance."*
- **Live Action**:
  1. Click **দলিল স্ক্যান ও ওসিআর** (`/scan`).
  2. Point out the on-device quality gate (blur, glare, resolution detection) with live camera guidance.
  3. Upload `khatian_sample.jpg` or use camera fallback.
  4. Observe instant **Cryptographic QR Scan**:
     - Status: `QR_VERIFIED` with SHA-256 seal against registry office records.
  5. Demonstrate **Bengali OCR Normalization**:
     - Bengali numerals `'১২০৫'` and `'৩৪০'` are normalized to canonical ASCII digits while preserving original Bengali script for display.
     - Notice epistemic badges: explicit `OCR_EXTRACTED` labeling vs `USER_CORRECTED`.

---

### [00:45 – 01:45] P3: Double-Sale & Concurrent Deed Conflict Engine

- **Narrator**:
  > *"When a fraudster registers duplicate deeds across separate sub-registry offices, traditional registries fail to detect it until years later in court. LandOS detects it deterministically in milliseconds."*
- **Live Action**:
  1. Navigate to **খতিয়ান ও দাগ রেকর্ড** (`/search`) or **দাগ বিরোধ অ্যালার্ট** (`/parcels/P-4520/alerts`).
  2. Select parcel **`P-4520`** (Tejgaon, Dag 1205, Khatian 340).
  3. Show the **6 Deterministic Conflict Rules**:
     - **Rule R1 (Concurrent Double Sale)**: Deed `D-2023-8891` (15.5 decimals to Abdul Karim) and Deed `D-2023-8892` (15.5 decimals to Rafiqul Islam) executed 4 days apart.
     - **Rule R6 (Mutation Discontinuity)**: Intermediate mutation missing from 2018 volume.
  4. Click on **ভূমি মন্ত্রণালয়ের সার্কুলার রেফারেন্স**: Show grounded citation with volume, page, and registry circular.

---

### [01:45 – 02:45] P5: Citizen Pre-Purchase Due Diligence Check

- **Narrator**:
  > *"Before placing a token payment, a citizen can perform a 60-second due diligence check with objective, neutral traffic lights."*
- **Live Action**:
  1. Open **বায়ার ডিউ ডিলিজেন্স** (`/buyer-report`).
  2. Click preset **`P-CLEAN-01`**:
     - All 6 traffic lights glow **GREEN**: Ownership match, no double-sale, not khas land, not acquired, no court litigation, khatian in sync.
     - Point out the **ব্রাউজার-নেটিভ প্রিন্ট বাটন** (`Print / PDF Export`).
     - Highlight the strict **Non-Legal Advice Disclaimer**: LandOS equips citizens with facts, never offering speculative guarantees.
  3. Switch to preset **`P-KHAS-01`**:
     - Traffic light #3 turns **RED**: `সরকারি খাস জমি (Khas Land - Rule R7)`.
     - System warns that transferring this plot is void under Section 52 of the State Acquisition and Tenancy Act.

---

### [02:45 – 03:45] P4: Smart E-Namjari State Machine & Auto-Verification

- **Narrator**:
  > *"Mutation in Bangladesh traditionally takes 28 to 45 days of physical visits. With Smart E-Namjari in LandOS, optical deed linking and automated pre-checks clear clean cases in under 7 days."*
- **Live Action**:
  1. Open **স্মার্ট ই-নামজারি** (`/namjari`).
  2. Show the **Public Tracking Stepper**: Enter or click preset **`NJ-2026-1001`**.
     - Display live milestone stepper: `আবেদন দাখিল` ➔ `স্বয়ংক্রিয় তথ্য নিরীক্ষা (Passed)` ➔ `শুনানি ও নথিপত্র পর্যালোচনা` ➔ `খতিয়ান হালনাগাদ ও নামজারি সম্পন্ন`.
  3. Show the **Automated AI Pre-Verification Checklist**:
     - QR & Cryptographic Seal: `PASS`
     - Seller & Record Ownership Match: `PASS`
     - Double-Sale Check (R1): `PASS`
     - Khas & Govt Land Restriction (R7): `PASS`
  4. Show the rejected case **`NJ-2026-1004`**: System automatically halted approval because Rule R1 detected a concurrent sale conflict!

---

### [03:45 – 04:30] P6: Parcel Guardian Watch & Bengali Voice Assistant

- **Narrator**:
  > *"For millions of non-technical citizens and rural land owners, text interfaces are a barrier. Watch our Parcel Guardian Bangla voice AI and proactive alert subscriptions."*
- **Live Action**:
  1. Click the floating **এআই সহকারী** (Microphone icon) at bottom right.
  2. Speak or trigger preset: *"জমি কেনার আগে P-4520 দাগের তথ্য যাচাই করুন"*
     - Web Speech API recognizes spoken Bengali numerals (`"চার পাঁচ দুই শূন্য"` ➔ `4520`).
     - Voice Assistant answers via Web Speech Synthesis in clear Bengali, providing a direct interactive action card for the Buyer Report and Namjari tracking.
  3. Click **পার্সেল গার্ডিয়ান ওয়াচ (Subscribe Watch)** on `P-4520`:
     - Citizen receives real-time simulated SMS notifications whenever mutation applications or deeds target their watched plot.
     - Open **সিমুলেটেড নোটিফিকেশন আউটবক্স** (`/parcels/P-4520/alerts` tab 2) to view dispatched SMS items.
  4. Demonstrate **Offline-First Mode**:
     - If network drops in a rural field office, documents are safely encrypted with AES-GCM and stored in IndexedDB until connectivity returns.

---

### [04:30 – 05:00] Governance, Accuracy Lab & Sovereign Tech Hand-Off

- **Narrator**:
  > *"Finally, how does the Ministry govern this AI system? LandOS is built with zero vendor lock-in and radical transparency."*
- **Live Action**:
  1. Switch to **Tech Admin** role.
  2. Open **এআই অ্যাকুরেসি ল্যাব** (`/quality`).
  3. Show the real-time quality metrics:
     - Character Error Rate (CER): `< 5.0%`
     - Field Extraction Accuracy (FEA): `>= 95.0%` across Dag, Khatian, and Mouza
     - Silent Error Rate: `0.0%`
  4. Show the automated **Release Gate**: If an experimental model's Dag accuracy falls below 95%, automated promotion into the land registry is blocked.
- **Closing Statement**:
  > *"Bangladesh LandOS transforms land administration from a source of conflict into an engine of sovereign digital trust. Built for Bangladesh, ready for deployment. Thank you!"*

---

## 4. Troubleshooting & Quick Fallbacks

| Issue During Demo | Immediate Fix |
| :--- | :--- |
| Database state modified during trial run | Run `python scripts/demo_reset.py` in PowerShell. |
| Microphone permission blocked in browser | Click browser address bar lock icon ➔ Allow Microphone ➔ Reload. Alternatively, click any suggested question chip inside the chat modal. |
| Need quick role switch | Click the floating key button at bottom right to open the Role Switcher Terminal. |
| Offline queue testing | Open DevTools Network tab ➔ Throttling ➔ Offline. Scan page automatically switches to local IndexedDB queue. |
