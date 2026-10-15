"""
Production Match Scorer with LightGBM and Robust Rule-Based Fallback.
Provides explainable matching between extracted document fields and database land records.
"""

from dataclasses import dataclass
import logging
import os
from typing import Any, Dict, List, Optional
import joblib
import numpy as np

from ml.src.scorer.explain import explain_match_score_bn
from ml.src.scorer.features import FEATURE_NAMES, extract_match_features, feature_dict_to_array

logger = logging.getLogger("landos.scorer")


@dataclass
class MatchResult:
    score: float
    is_match: bool
    reasons_bn: List[str]
    summary_bn: str
    feature_contributions: Dict[str, float]
    engine_used: str  # "lightgbm_calibrated" | "rule_based_fallback"


class MatchScorer:
    """
    Evaluates land document match candidates.
    Uses calibrated LightGBM model if models/match_v1.joblib exists,
    otherwise smoothly falls back to an additive rule-based scoring engine.
    """

    def __init__(self, model_path: Optional[str] = None):
        self.model_path = model_path or self._resolve_model_path()
        self.model = None
        self.base_lgbm = None
        self.shap_explainer = None
        self.is_loaded = False

        self._load_model()

    def _resolve_model_path(self) -> str:
        candidates = [
            "models/match_v1.joblib",
            "ml/models/match_v1.joblib",
            os.path.join(os.path.dirname(__file__), "../../../models/match_v1.joblib"),
            os.path.join(os.path.dirname(__file__), "../../models/match_v1.joblib"),
        ]
        for c in candidates:
            if os.path.exists(c):
                return os.path.abspath(c)
        return candidates[0]

    def _load_model(self):
        if os.path.exists(self.model_path):
            try:
                artifact = joblib.load(self.model_path)
                self.model = artifact.get("model")
                self.base_lgbm = artifact.get("base_lgbm")
                self.is_loaded = True
                logger.info(f"Loaded calibrated MatchScorer model from: {self.model_path}")

                # Initialize SHAP TreeExplainer if available
                if self.base_lgbm is not None:
                    try:
                        import shap
                        self.shap_explainer = shap.TreeExplainer(self.base_lgbm)
                    except Exception:
                        pass
                return
            except Exception as e:
                logger.warning(f"Failed to load model file {self.model_path}: {e}. Using fallback.")
        logger.info("Match model file not found; initializing rule-based fallback scorer.")
        self.is_loaded = False

    def score(
        self,
        query_fields: Dict[str, Any],
        target_record: Dict[str, Any],
        threshold: float = 0.85,
    ) -> MatchResult:
        """Scores a query-target record pair and produces Bengali explainability."""
        fdict = extract_match_features(query_fields, target_record)
        fvec = feature_dict_to_array(fdict).reshape(1, -1)

        contributions: Dict[str, float] = {}

        if self.is_loaded and self.model is not None:
            # 1. LightGBM Calibrated Inference
            try:
                prob = float(self.model.predict_proba(fvec)[0, 1])
                engine_used = "lightgbm_calibrated"

                # SHAP contributions
                if self.shap_explainer is not None:
                    try:
                        sv = self.shap_explainer.shap_values(fvec)
                        # TreeExplainer for binary returns array of shape (1, n_features) or list
                        vals = sv[1][0] if isinstance(sv, list) else sv[0]
                        for idx, fname in enumerate(FEATURE_NAMES):
                            contributions[fname] = round(float(vals[idx]), 3)
                    except Exception:
                        contributions = {k: v for k, v in fdict.items()}
                else:
                    contributions = {k: v for k, v in fdict.items()}

                reasons, summary = explain_match_score_bn(fdict, contributions)

                return MatchResult(
                    score=round(prob, 4),
                    is_match=prob >= threshold,
                    reasons_bn=reasons,
                    summary_bn=summary,
                    feature_contributions=contributions,
                    engine_used=engine_used,
                )
            except Exception as e:
                logger.warning(f"Error during model inference: {e}; falling back to rules.")

        # 2. Rule-Based Fallback Scorer
        return self._score_rule_based(fdict, threshold)

    def _score_rule_based(self, fdict: Dict[str, float], threshold: float) -> MatchResult:
        """Additive rule-based scoring engine when model is absent."""
        score = 0.0

        # Weights:
        # Exact dag: 0.35, exact khatian: 0.35, exact mouza: 0.20, survey: 0.05, owner: 0.05
        if fdict.get("exact_dag", 0.0) == 1.0:
            score += 0.35
        else:
            score += 0.25 * fdict.get("fuzz_ratio_dag", 0.0)

        if fdict.get("exact_khatian", 0.0) == 1.0:
            score += 0.35
        else:
            score += 0.25 * fdict.get("fuzz_ratio_khatian", 0.0)

        if fdict.get("exact_mouza", 0.0) == 1.0:
            score += 0.20
        else:
            score += 0.15 * fdict.get("mouza_match_level", 0.0)

        if fdict.get("exact_survey", 0.0) == 1.0:
            score += 0.05

        score += 0.05 * fdict.get("fuzz_ratio_owner", 0.0)

        score = max(0.0, min(0.99, score))
        contributions = {k: v for k, v in fdict.items()}
        reasons, summary = explain_match_score_bn(fdict, contributions)

        return MatchResult(
            score=round(score, 4),
            is_match=score >= threshold,
            reasons_bn=reasons,
            summary_bn=summary,
            feature_contributions=contributions,
            engine_used="rule_based_fallback",
        )


_global_scorer: Optional[MatchScorer] = None


def get_match_scorer() -> MatchScorer:
    global _global_scorer
    if _global_scorer is None:
        _global_scorer = MatchScorer()
    return _global_scorer
