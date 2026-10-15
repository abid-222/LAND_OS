"""
ML Training Entrypoint: Trains Document-to-Record Match Scorer (LightGBM).
Invoked via: `make train` (cd ml && python src/train.py)
"""

import logging
import os
import sys

# Ensure repository root and ml/ are on sys.path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
ml_root = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
for p in [repo_root, ml_root]:
    if p not in sys.path:
        sys.path.insert(0, p)

from ml.src.scorer.train import train_match_scorer

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("landos.ml.train")


def main():
    logger.info("Starting LandOS Match Scorer Training Pipeline...")
    pairs_candidates = [
        "data/synthetic/match_pairs.json",
        os.path.join(repo_root, "data/synthetic/match_pairs.json"),
    ]
    records_candidates = [
        "data/seed/land_records_5000.json",
        os.path.join(repo_root, "data/seed/land_records_5000.json"),
    ]

    pairs_path = next((p for p in pairs_candidates if os.path.exists(p)), pairs_candidates[0])
    records_path = next((r for r in records_candidates if os.path.exists(r)), records_candidates[0])

    metrics = train_match_scorer(
        pairs_path=pairs_path,
        records_path=records_path,
        output_model_path=os.path.join(repo_root, "models/match_v1.joblib"),
        model_card_path=os.path.join(repo_root, "ml/models/match_v1_model_card.md"),
    )
    logger.info("Training finished successfully. Summary metrics:")
    for k, v in metrics.items():
        logger.info(f"  {k}: {v}")


if __name__ == "__main__":
    main()
