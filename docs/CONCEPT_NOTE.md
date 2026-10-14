# Bangladesh LandOS — Concept Note

## Executive Summary
**Bangladesh LandOS** is a mobile-first, Scan-to-Search digital land service and document intelligence platform tailored specifically for citizens, land office staff, and land administration officials in Bangladesh. 

The core mission is solving centuries-old land administration opacity, forged deeds, convoluted khatian tracing (CS, SA, RS, BS/City Survey), mutation backlogs, and predatory middlemen (*dalals*). By allowing citizens to point their smartphone browser camera at any physical land record (Khatian / Parcha, Deed / Dalil, DCR, Mutation proposal, or Holding Tax receipt), LandOS instantaneously performs OCR, layout extraction, Bengali numeral normalization, fuzzy entity matching, and chain-of-title verification.

## Core Problem Statements
1. **Document Fragmentation**: Multiple historical survey types (Cadastral Survey / CS, State Acquisition / SA, Revisional Survey / RS, Bangladesh Survey / BS) with varying layouts, handwritten Bengali scripts, and archaic legal lexicon.
2. **Citizen Vulnerability**: Non-technical rural citizens lack easy means to verify genuine documents, track mutation progress, or know the exact government fees, making them prey to extortionate intermediaries.
3. **Bandwidth & Device Constraints**: Real users in upazilas/mouzas access services on entry-level Android devices (360px-400px viewports) over erratic 3G/4G cellular connections. Native apps create friction (app store accounts, storage quotas).
4. **Epistemic Trust**: Unverified AI hallucination in legal and land records causes catastrophic disputes. Land records cannot afford "probabilistic guesses" masquerading as settled legal facts.

## Solution Architecture: Mobile-First Responsive Web
- **No Native App Barrier**: Zero downloads. Instant browser access via standard mobile browsers (Chrome, Safari, Samsung Internet).
- **Scan-to-Search**: In-browser camera capture (`getUserMedia` with environmental fallback), client-side pre-processing, QR scanning via `zxing-wasm`.
- **Strict Epistemic Trust Labels**: Every extracted or matched entity is labeled with an immutable trust state:
  - `OCR_EXTRACTED`: Direct optical character recognition output, subject to human/source verification.
  - `POSSIBLE_MATCH`: Fuzzy or algorithmic candidate match.
  - `USER_CORRECTED`: Corrected or modified by the citizen or operator.
  - `VERIFIED_AUTHORIZED_SOURCE`: Cryptographically or authority-backed verified record (only backend can assign).
  - `VERIFICATION_REQUIRED`: Unresolved discrepancy requiring physical/sub-registry verification.
- **Bangla-First UX**: Default Bangla (`bn`) typography with clear Bengali numerals (`০-৯`), high-contrast accessible touch targets (min 48px), and bottom navigation thumb-zones.
- **Constrained AI Guide**: AI Q&A strictly grounded in curated, verified government manuals, laws, and fee circulars with exact citations and verification dates.

## Ethical & Legal Disclaimers
1. All demo and prototype records use synthetic data.
2. Digital maps and parcel boundaries are strictly illustrative and not admissible as legal title demarcations without official cadastral land survey validation.
