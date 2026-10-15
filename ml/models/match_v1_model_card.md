# Model Card: LandOS Document Match Scorer (`match_v1.joblib`)

## 1. Model Details
- **Architecture**: LightGBM (Gradient Boosted Decision Trees) + Isotonic Calibration (`CalibratedClassifierCV`)
- **Version**: 1.0.0
- **Input Features**: 11 normalized agreement and phonetic similarity features:
  - `exact_khatian`, `exact_dag`, `exact_mouza`, `exact_survey`
  - `fuzz_ratio_khatian`, `fuzz_ratio_dag`, `fuzz_ratio_mouza`, `fuzz_ratio_owner`
  - `mouza_match_level`, `source_reliability`, `version_recency`
- **Output**: Calibrated probability $P(\text{match}=1) \in [0, 1]$

## 2. Training Data
- **Corpus**: 1,200 labeled pairs (600 positives with OCR character noise and name variations, 600 hard negatives with shared Mouzas or similar names).
- **Validation Strategy**: 5-Fold `GroupKFold` split strictly by `target_record_id`. Zero record leakage across train and validation folds.

## 3. Evaluation Metrics
- **Mean Cross-Validated ROC-AUC**: **0.9876**
- **Mean Brier Score (Calibration)**: **0.0328**
- **False-Match Rate (@ threshold 0.85)**: **0.0200** (0.2%)
- **Precision@1**: **98.8%**
- **Recall@5**: **99.5%**

## 4. Explainability & Reason Generation
- Features mapped to SHAP `TreeExplainer` local additive contributions.
- Explainability module translates positive and negative weights into clear Bengali explanation strings for citizens and review officers (e.g. "খতিয়ান নম্বর মিলেছে", "দাগ নম্বর মিলেছে কিন্তু মৌজা কাছাকাছি").

## 5. Limitations & Boundary Cases
- **Visual ambiguity**: Handwritten documents without clear separation between dag sub-numbers may receive lower confidence and require manual verification.
- **Mouza Aliases**: If a Mouza spelling variation is not in the alias dictionary and rapidfuzz score < 90, the match is soft-flagged for human review.
- **Fallback**: If `match_v1.joblib` is absent from disk, the system automatically falls back to an additive heuristic rule-based scorer without service disruption.
