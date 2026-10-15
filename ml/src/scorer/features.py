"""
Feature Extraction for Document-to-Record Match Scoring.
Extracts:
- Exact agreement per field (khatian, dag, mouza, survey)
- Rapidfuzz similarity ratios (khatian, dag, mouza, owner name)
- Mouza match classification
- Source reliability score
- Version recency score
"""

from typing import Any, Dict, List
import numpy as np
from rapidfuzz import fuzz

from backend.app.core.normalize import normalize_identifier, normalize_mouza

FEATURE_NAMES = [
    "exact_khatian",
    "exact_dag",
    "exact_mouza",
    "exact_survey",
    "fuzz_ratio_khatian",
    "fuzz_ratio_dag",
    "fuzz_ratio_mouza",
    "fuzz_ratio_owner",
    "mouza_match_level",
    "source_reliability",
    "version_recency",
]


def extract_match_features(query_fields: Dict[str, Any], target_record: Dict[str, Any]) -> Dict[str, float]:
    """
    Computes numerical matching features between an OCR query and a database land record.
    """
    # 1. Normalize query identifiers
    q_khatian_norm = normalize_identifier(str(query_fields.get("khatian_no", "")), "khatian_no").normalized_value or ""
    q_dag_norm = normalize_identifier(str(query_fields.get("dag_no", "")), "dag_no").normalized_value or ""
    q_mouza_norm = normalize_mouza(str(query_fields.get("mouza_name_bn", ""))).normalized_name or ""
    q_survey = str(query_fields.get("survey_type", "")).upper().strip()
    q_owner = str(query_fields.get("owner_name", "")).strip()

    # 2. Normalize target record identifiers
    t_khatian_norm = str(target_record.get("khatian_no_raw") or target_record.get("khatian_no", "")).strip()
    t_dag_norm = str(target_record.get("dag_no_raw") or target_record.get("dag_no", "")).strip()
    t_mouza_norm = normalize_mouza(str(target_record.get("mouza_name_bn", ""))).normalized_name or ""
    t_survey = str(target_record.get("survey_type", "")).upper().strip()
    t_owner = str(target_record.get("owner_names_bn", "")).strip()

    # Normalize target khatian/dag using engine as well
    t_khatian_clean = normalize_identifier(t_khatian_norm, "khatian_no").normalized_value or t_khatian_norm
    t_dag_clean = normalize_identifier(t_dag_norm, "dag_no").normalized_value or t_dag_norm

    # Exact agreement
    exact_khatian = 1.0 if (q_khatian_norm and t_khatian_clean and q_khatian_norm == t_khatian_clean) else 0.0
    exact_dag = 1.0 if (q_dag_norm and t_dag_clean and q_dag_norm == t_dag_clean) else 0.0
    exact_mouza = 1.0 if (q_mouza_norm and t_mouza_norm and q_mouza_norm == t_mouza_norm) else 0.0
    exact_survey = 1.0 if (q_survey and t_survey and q_survey == t_survey) else 0.0

    # Rapidfuzz ratios [0.0 .. 1.0]
    fuzz_khatian = fuzz.ratio(str(query_fields.get("khatian_no", "")), str(target_record.get("khatian_no", ""))) / 100.0
    fuzz_dag = fuzz.ratio(str(query_fields.get("dag_no", "")), str(target_record.get("dag_no", ""))) / 100.0
    fuzz_mouza = fuzz.token_sort_ratio(q_mouza_norm, t_mouza_norm) / 100.0 if (q_mouza_norm and t_mouza_norm) else 0.0
    fuzz_owner = fuzz.partial_ratio(q_owner, t_owner) / 100.0 if (q_owner and t_owner) else 0.50

    # Mouza match level
    if exact_mouza == 1.0:
        mouza_match_level = 1.0
    elif fuzz_mouza >= 0.85:
        mouza_match_level = 0.70
    elif fuzz_mouza >= 0.65:
        mouza_match_level = 0.40
    else:
        mouza_match_level = 0.0

    # Source reliability
    source_ref = str(target_record.get("source_ref", "")).upper()
    if "OFFICIAL" in source_ref or "GOV" in source_ref:
        source_rel = 1.0
    elif "SYNTHETIC" in source_ref or "DEMO" in source_ref:
        source_rel = 0.90
    else:
        source_rel = 0.75

    # Version recency
    ver = float(target_record.get("version", 1))
    version_rec = min(1.0, ver / 5.0)

    return {
        "exact_khatian": exact_khatian,
        "exact_dag": exact_dag,
        "exact_mouza": exact_mouza,
        "exact_survey": exact_survey,
        "fuzz_ratio_khatian": round(fuzz_khatian, 3),
        "fuzz_ratio_dag": round(fuzz_dag, 3),
        "fuzz_ratio_mouza": round(fuzz_mouza, 3),
        "fuzz_ratio_owner": round(fuzz_owner, 3),
        "mouza_match_level": mouza_match_level,
        "source_reliability": source_rel,
        "version_recency": version_rec,
    }


def feature_dict_to_array(fdict: Dict[str, float]) -> np.ndarray:
    return np.array([fdict[k] for k in FEATURE_NAMES], dtype=np.float32)
