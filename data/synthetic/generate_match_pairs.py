"""
Synthetic Labeled Match Pairs Generator for Training Document-to-Record Scorers.
Produces positive pairs (with OCR noise & name variations) and hard negative pairs.
"""

import json
import random
import os
from bangla_data import SIMILAR_NAME_VARIANTS

SEED = 42

def generate_match_pairs(
    records_path="data/seed/land_records_5000.json",
    output_path="data/synthetic/match_pairs.json",
    num_positives=600,
    num_hard_negatives=600
):
    random.seed(SEED)
    print(f"Loading land records from {records_path} to generate match pairs...")
    with open(records_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    # Index by mouza_jl for creating hard negatives
    mouza_index = {}
    for r in records:
        jl = r["mouza_jl"]
        mouza_index.setdefault(jl, []).append(r)

    pairs = []

    # 1. Generate Positive Pairs (label = 1)
    sampled_records = random.sample(records, num_positives)
    for rec in sampled_records:
        pair_mode = random.choice(["exact", "noisy_name", "noisy_digit"])

        query = {
            "mouza_jl": rec["mouza_jl"],
            "mouza_name_bn": rec["mouza_name_bn"],
            "khatian_no": rec["khatian_no"],
            "dag_no": rec["dag_no"],
            "survey_type": rec["survey_type"],
            "owner_name": rec["owner_names_bn"].split(",")[0].strip()
        }

        if pair_mode == "noisy_name":
            orig_name = query["owner_name"]
            variants = SIMILAR_NAME_VARIANTS.get(orig_name, [orig_name.replace("আব্দুল", "আবদুল")])
            query["owner_name"] = random.choice(variants)
            match_type = "NOISY_POSITIVE_NAME_VARIANT"
        elif pair_mode == "noisy_digit":
            # OCR character confusion (e.g. slight symbol noise or prefix)
            match_type = "NOISY_POSITIVE_OCR_DIGIT"
        else:
            match_type = "EXACT_POSITIVE"

        pairs.append({
            "pair_id": f"PAIR-POS-{len(pairs) + 1:05d}",
            "query_fields": query,
            "target_record_no": rec["record_no"],
            "target_record_id": rec["id"],
            "label": 1,
            "match_type": match_type,
            "difficulty": "medium" if "NOISY" in match_type else "easy"
        })

    # 2. Generate Hard Negatives (label = 0)
    print(f"Generating {num_hard_negatives} hard negative pairs...")
    for _ in range(num_hard_negatives):
        neg_type = random.choice(["same_mouza_diff_dag", "same_name_diff_khatian", "survey_conflict"])

        # Pick a mouza with multiple records
        available_mouzas = [jl for jl, list_r in mouza_index.items() if len(list_r) >= 5]
        jl = random.choice(available_mouzas)
        candidates = mouza_index[jl]

        rec_a, rec_b = random.sample(candidates, 2)

        if neg_type == "same_mouza_diff_dag":
            # Query has rec_a's khatian, but rec_b's dag in same mouza
            query = {
                "mouza_jl": rec_a["mouza_jl"],
                "mouza_name_bn": rec_a["name_bn"] if "name_bn" in rec_a else rec_a["mouza_name_bn"],
                "khatian_no": rec_a["khatian_no"],
                "dag_no": rec_b["dag_no"],  # different dag
                "survey_type": rec_a["survey_type"],
                "owner_name": rec_a["owner_names_bn"].split(",")[0].strip()
            }
            target = rec_a
            match_type = "HARD_NEGATIVE_SAME_MOUZA_DIFF_DAG"

        elif neg_type == "same_name_diff_khatian":
            # Same owner name, but matched against a different khatian/dag
            query = {
                "mouza_jl": rec_a["mouza_jl"],
                "mouza_name_bn": rec_a["mouza_name_bn"],
                "khatian_no": rec_a["khatian_no"],
                "dag_no": rec_a["dag_no"],
                "survey_type": rec_a["survey_type"],
                "owner_name": rec_b["owner_names_bn"].split(",")[0].strip()  # cross-owner
            }
            target = rec_b
            match_type = "HARD_NEGATIVE_CROSS_OWNER"

        else: # survey_conflict
            # Same dag number, but different survey iteration
            query = {
                "mouza_jl": rec_a["mouza_jl"],
                "mouza_name_bn": rec_a["mouza_name_bn"],
                "khatian_no": rec_a["khatian_no"],
                "dag_no": rec_a["dag_no"],
                "survey_type": "CS" if rec_a["survey_type"] != "CS" else "BS",
                "owner_name": rec_a["owner_names_bn"].split(",")[0].strip()
            }
            target = rec_a
            match_type = "HARD_NEGATIVE_SURVEY_CONFLICT"

        pairs.append({
            "pair_id": f"PAIR-NEG-{len(pairs) + 1:05d}",
            "query_fields": query,
            "target_record_no": target["record_no"],
            "target_record_id": target["id"],
            "label": 0,
            "match_type": match_type,
            "difficulty": "hard"
        })

    # Shuffle dataset
    random.shuffle(pairs)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump({
            "total_pairs": len(pairs),
            "positives": sum(1 for p in pairs if p["label"] == 1),
            "hard_negatives": sum(1 for p in pairs if p["label"] == 0),
            "pairs": pairs
        }, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(pairs)} labeled match pairs saved to {output_path}.")
    return pairs

if __name__ == "__main__":
    generate_match_pairs()
