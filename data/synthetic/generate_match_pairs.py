"""
Synthetic Labeled Match Pairs Generator for Training Document-to-Record Scorers.
Produces diverse positive pairs (exact, noisy names, digit confusions, ASCII/Bengali numeral variations, sub-dag partitions)
and challenging hard negative pairs (same mouza different dag, cross-owner name collision, survey conflicts, transposed digits).
"""

import json
import os
import random
import unicodedata
from typing import Any, Dict, List

# Bengali Name Variations & Honorifics
HONORIFIC_PREFIXES = ["মোঃ ", "মোহাম্মদ ", "মো: ", "হাজী ", "বেগম ", "আলহাজ্ব ", "শ্রী ", "ড. "]
SUFFIX_AFFIXES = [" ও অন্যান্য", " গং", " খান", " চৌধুরী", " মিয়া", " তালুকদার"]

BN_TO_EN = str.maketrans("০১২৩৪৫৬৭৮৯", "0123456789")
EN_TO_BN = str.maketrans("0123456789", "০১২৩৪৫৬৭৮৯")

DIGIT_CONFUSION_MAP = {
    "৪": "৮",
    "৮": "৪",
    "১": "৭",
    "৭": "১",
    "৫": "৬",
    "৬": "৫",
    "২": "৩",
    "৩": "২",
    "০": "১",
    "১": "০",
}

NAME_SPELLING_VARIANTS = {
    "আব্দুল": "আবদুল",
    "আবদুল": "আব্দুল",
    "মোহাম্মদ": "মুহাম্মদ",
    "হোসেন": "হোসাইন",
    "হোসাইন": "হোসেন",
    "রহমান": "রহমান",
    "চৌধুরী": "চৌধুরি",
    "আলী": "আলি",
    "রফিকুল": "রফিক",
    "শফিকুল": "শফিক",
    "খাতুন": "বেগম",
}

SEED = 42


def apply_digit_noise(digit_str: str) -> str:
    """Simulates realistic optical scanner character confusion."""
    if not digit_str:
        return digit_str
    chars = list(digit_str)
    # Pick one character to confuse if eligible
    eligible_indices = [i for i, c in enumerate(chars) if c in DIGIT_CONFUSION_MAP]
    if eligible_indices:
        idx = random.choice(eligible_indices)
        chars[idx] = DIGIT_CONFUSION_MAP[chars[idx]]
    return "".join(chars)


def generate_match_pairs(
    records_path: str = "data/seed/land_records_5000.json",
    output_path: str = "data/synthetic/match_pairs.json",
    num_positives: int = 800,
    num_hard_negatives: int = 800,
) -> List[Dict[str, Any]]:
    random.seed(SEED)
    print(f"Loading land records from {records_path} to generate match pairs...")
    if not os.path.exists(records_path):
        records_path = os.path.join("..", "..", records_path)

    with open(records_path, "r", encoding="utf-8") as f:
        records = json.load(f)

    # Index records by mouza and upazila for constructing hard negatives
    mouza_index: Dict[str, List[Dict[str, Any]]] = {}
    for r in records:
        jl = r.get("mouza_jl") or r.get("mouza_name_bn", "default")
        mouza_index.setdefault(jl, []).append(r)

    pairs: List[Dict[str, Any]] = []

    # 1. Generate Positive Pairs (label = 1)
    # Balanced mix: Exact, Name Variant, Digit Confusions, Numeral Script Shifts
    sampled_records = random.sample(records, min(num_positives, len(records)))
    for rec in sampled_records:
        pair_mode = random.choices(
            ["exact", "name_honorific", "name_variant", "numeral_script", "digit_confusion", "subdag"],
            weights=[0.30, 0.20, 0.15, 0.15, 0.10, 0.10],
            k=1,
        )[0]

        primary_owner = rec["owner_names_bn"].split(",")[0].strip()
        query = {
            "mouza_jl": rec.get("mouza_jl", "০১"),
            "mouza_name_bn": rec.get("mouza_name_bn", "কাওরান বাজার"),
            "khatian_no": str(rec.get("khatian_no", "১০০")),
            "dag_no": str(rec.get("dag_no", "১০০১")),
            "survey_type": rec.get("survey_type", "RS"),
            "owner_name": primary_owner,
        }

        match_type = "EXACT_POSITIVE"
        difficulty = "easy"

        if pair_mode == "name_honorific":
            # Add or alter honorific prefix / suffix
            if not any(query["owner_name"].startswith(p) for p in HONORIFIC_PREFIXES):
                query["owner_name"] = random.choice(HONORIFIC_PREFIXES) + query["owner_name"]
            else:
                for p in HONORIFIC_PREFIXES:
                    if query["owner_name"].startswith(p):
                        query["owner_name"] = query["owner_name"][len(p):].strip()
                        break
            match_type = "NOISY_POSITIVE_NAME_HONORIFIC"
            difficulty = "medium"

        elif pair_mode == "name_variant":
            for k, v in NAME_SPELLING_VARIANTS.items():
                if k in query["owner_name"]:
                    query["owner_name"] = query["owner_name"].replace(k, v)
                    break
            else:
                query["owner_name"] = query["owner_name"] + random.choice(SUFFIX_AFFIXES)
            match_type = "NOISY_POSITIVE_NAME_VARIANT"
            difficulty = "medium"

        elif pair_mode == "numeral_script":
            # Convert Bengali digits to ASCII numerals (common in digital inputs)
            query["dag_no"] = query["dag_no"].translate(BN_TO_EN)
            query["khatian_no"] = query["khatian_no"].translate(BN_TO_EN)
            match_type = "NOISY_POSITIVE_NUMERAL_SCRIPT"
            difficulty = "medium"

        elif pair_mode == "digit_confusion":
            # Subtle OCR misread on Dag or Khatian
            if random.random() < 0.5:
                query["dag_no"] = apply_digit_noise(query["dag_no"])
            else:
                query["khatian_no"] = apply_digit_noise(query["khatian_no"])
            match_type = "NOISY_POSITIVE_OCR_DIGIT"
            difficulty = "hard"

        elif pair_mode == "subdag":
            # Partitioned parcel sub-plot notation (e.g. ১২০৫ -> ১২০৫/১)
            query["dag_no"] = f"{query['dag_no']}/{random.choice(['১', '২', 'ক'])}"
            match_type = "NOISY_POSITIVE_SUBDAG"
            difficulty = "medium"

        pairs.append({
            "pair_id": f"PAIR-POS-{len(pairs) + 1:05d}",
            "query_fields": query,
            "target_record_no": rec["record_no"],
            "target_record_id": rec["id"],
            "label": 1,
            "match_type": match_type,
            "difficulty": difficulty,
        })

    # 2. Generate Hard Negatives (label = 0)
    print(f"Generating {num_hard_negatives} hard negative pairs...")
    available_mouzas = [jl for jl, list_r in mouza_index.items() if len(list_r) >= 3]

    for _ in range(num_hard_negatives):
        neg_mode = random.choices(
            ["same_mouza_diff_dag", "same_name_diff_khatian", "survey_conflict", "transposed_dag", "diff_mouza_same_dag"],
            weights=[0.35, 0.25, 0.15, 0.15, 0.10],
            k=1,
        )[0]

        jl = random.choice(available_mouzas)
        candidates = mouza_index[jl]
        rec_a, rec_b = random.sample(candidates, 2)

        if neg_mode == "same_mouza_diff_dag":
            # Query has rec_a's khatian and mouza, but rec_b's dag number
            query = {
                "mouza_jl": rec_a.get("mouza_jl", jl),
                "mouza_name_bn": rec_a.get("mouza_name_bn", ""),
                "khatian_no": str(rec_a.get("khatian_no", "")),
                "dag_no": str(rec_b.get("dag_no", "")),  # Different dag
                "survey_type": rec_a.get("survey_type", "RS"),
                "owner_name": rec_a["owner_names_bn"].split(",")[0].strip(),
            }
            target = rec_a
            match_type = "HARD_NEGATIVE_SAME_MOUZA_DIFF_DAG"

        elif neg_mode == "same_name_diff_khatian":
            # Query has identical owner name, but matched against a different khatian/dag
            query = {
                "mouza_jl": rec_a.get("mouza_jl", jl),
                "mouza_name_bn": rec_a.get("mouza_name_bn", ""),
                "khatian_no": str(rec_a.get("khatian_no", "")),
                "dag_no": str(rec_a.get("dag_no", "")),
                "survey_type": rec_a.get("survey_type", "RS"),
                "owner_name": rec_b["owner_names_bn"].split(",")[0].strip(),
            }
            target = rec_b
            match_type = "HARD_NEGATIVE_CROSS_OWNER"

        elif neg_mode == "survey_conflict":
            # Same dag and khatian numbers, but mismatched historical survey (e.g. CS vs BS)
            curr_surv = rec_a.get("survey_type", "RS")
            other_surv = "CS" if curr_surv != "CS" else "BS"
            query = {
                "mouza_jl": rec_a.get("mouza_jl", jl),
                "mouza_name_bn": rec_a.get("mouza_name_bn", ""),
                "khatian_no": str(rec_a.get("khatian_no", "")),
                "dag_no": str(rec_a.get("dag_no", "")),
                "survey_type": other_surv,
                "owner_name": rec_a["owner_names_bn"].split(",")[0].strip(),
            }
            target = rec_a
            match_type = "HARD_NEGATIVE_SURVEY_CONFLICT"

        elif neg_mode == "transposed_dag":
            # Transposed digits on dag (e.g. 1205 -> 1250)
            orig_dag = str(rec_a.get("dag_no", "১২০৫"))
            if len(orig_dag) >= 2:
                transposed_dag = orig_dag[:-2] + orig_dag[-1] + orig_dag[-2]
            else:
                transposed_dag = orig_dag + "০"
            query = {
                "mouza_jl": rec_a.get("mouza_jl", jl),
                "mouza_name_bn": rec_a.get("mouza_name_bn", ""),
                "khatian_no": str(rec_a.get("khatian_no", "")),
                "dag_no": transposed_dag,
                "survey_type": rec_a.get("survey_type", "RS"),
                "owner_name": rec_a["owner_names_bn"].split(",")[0].strip(),
            }
            target = rec_a
            match_type = "HARD_NEGATIVE_TRANSPOSED_DAG"

        else:  # diff_mouza_same_dag
            # Same dag number but across distinct mouzas
            other_jl = random.choice([x for x in available_mouzas if x != jl])
            other_rec = random.choice(mouza_index[other_jl])
            query = {
                "mouza_jl": other_rec.get("mouza_jl", other_jl),
                "mouza_name_bn": other_rec.get("mouza_name_bn", ""),
                "khatian_no": str(rec_a.get("khatian_no", "")),
                "dag_no": str(rec_a.get("dag_no", "")),
                "survey_type": rec_a.get("survey_type", "RS"),
                "owner_name": rec_a["owner_names_bn"].split(",")[0].strip(),
            }
            target = rec_a
            match_type = "HARD_NEGATIVE_CROSS_MOUZA"

        pairs.append({
            "pair_id": f"PAIR-NEG-{len(pairs) + 1:05d}",
            "query_fields": query,
            "target_record_no": target["record_no"],
            "target_record_id": target["id"],
            "label": 0,
            "match_type": match_type,
            "difficulty": "hard",
        })

    # Shuffle dataset deterministically
    random.shuffle(pairs)

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(
            {
                "version": "2.0.0",
                "total_pairs": len(pairs),
                "positives": sum(1 for p in pairs if p["label"] == 1),
                "hard_negatives": sum(1 for p in pairs if p["label"] == 0),
                "pairs": pairs,
            },
            f,
            ensure_ascii=False,
            indent=2,
        )

    print(f"Generated {len(pairs)} high-quality labeled match pairs saved to {output_path}.")
    return pairs


if __name__ == "__main__":
    generate_match_pairs()
