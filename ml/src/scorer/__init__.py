"""
Match Scorer Package for Land Document-to-Record Resolution.
Includes feature extraction, LightGBM model scoring, SHAP explainability, and rule-based fallback.
"""

from ml.src.scorer.scorer import MatchScorer, get_match_scorer
from ml.src.scorer.features import extract_match_features
from ml.src.scorer.explain import explain_match_score_bn
