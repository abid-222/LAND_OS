"""
Bengali Explainability Engine for Document Matching.
Converts per-feature SHAP contributions or additive rule scores into
natural Bengali reason strings:
e.g. "খতিয়ান নম্বর মিলেছে", "দাগ নম্বর মিলেছে কিন্তু মৌজা কাছাকাছি", "মালিকের নাম ধ্বনিগতভাবে কাছাকাছি".
"""

from typing import Dict, List, Optional, Tuple
import numpy as np


def explain_match_score_bn(
    features: Dict[str, float],
    shap_contributions: Optional[Dict[str, float]] = None,
) -> Tuple[List[str], str]:
    """
    Produces list of Bengali explanation reasons and a combined summary.
    Works seamlessly with both SHAP TreeExplainer values and additive rule features.
    """
    reasons: List[str] = []

    khatian_hit = (features.get("exact_khatian", 0.0) == 1.0) or (
        shap_contributions and shap_contributions.get("exact_khatian", 0.0) > 0.10
    )
    dag_hit = (features.get("exact_dag", 0.0) == 1.0) or (
        shap_contributions and shap_contributions.get("exact_dag", 0.0) > 0.10
    )
    mouza_hit = features.get("exact_mouza", 0.0) == 1.0
    mouza_near = features.get("mouza_match_level", 0.0) in (0.40, 0.70)
    survey_hit = features.get("exact_survey", 0.0) == 1.0
    owner_hit = features.get("fuzz_ratio_owner", 0.0) >= 0.80

    # Composite combinations
    if khatian_hit and dag_hit and mouza_hit:
        reasons.append("খতিয়ান, দাগ এবং মৌজা নম্বর হুবহু মিলেছে")
    elif khatian_hit and mouza_near and not dag_hit:
        reasons.append("খতিয়ান নম্বর মিলেছে কিন্তু মৌজা কাছাকাছি")
    elif dag_hit and mouza_near and not khatian_hit:
        reasons.append("দাগ নম্বর মিলেছে কিন্তু মৌজা কাছাকাছি")
    else:
        if khatian_hit:
            reasons.append("খতিয়ান নম্বর মিলেছে")
        elif features.get("fuzz_ratio_khatian", 0.0) >= 0.75:
            reasons.append("খতিয়ান নম্বর কাছাকাছি")

        if dag_hit:
            reasons.append("দাগ নম্বর মিলেছে")
        elif features.get("fuzz_ratio_dag", 0.0) >= 0.75:
            reasons.append("দাগ নম্বর কাছাকাছি")

        if mouza_hit:
            reasons.append("মৌজা মিলেছে")
        elif mouza_near:
            reasons.append("মৌজার নাম কাছাকাছি")

    if owner_hit:
        reasons.append("মালিকের নাম সামঞ্জস্যপূর্ণ")
    elif features.get("fuzz_ratio_owner", 0.0) >= 0.60:
        reasons.append("মালিকের নাম আংশিক মিলেছে")

    if survey_hit:
        reasons.append("জরিপের ধরন মিলেছে")

    # If no major hits
    if not reasons:
        reasons.append("দাগ বা খতিয়ান নম্বরে অমিল রয়েছে")

    summary_bn = " এবং ".join(reasons)
    return reasons, summary_bn
