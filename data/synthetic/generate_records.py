"""
Synthetic Land Records Generator: Produces 5,000+ Bengali records across 40 mouzas
with deliberate near-duplicates and character variations to stress-test matching.
"""

import json
import random
import os
import uuid
from faker import Faker
from bangla_data import (
    MOUZAS,
    BANGLA_NAMES_MALE,
    BANGLA_NAMES_FEMALE,
    SIMILAR_NAME_VARIANTS,
    LAND_CLASSES_BN,
    SURVEY_TYPES,
    to_bn_digits,
)

SEED = 42

def generate_5000_records(output_path="data/seed/land_records_5000.json", target_count=5200):
    random.seed(SEED)
    _fake = Faker('bn_BD')
    Faker.seed(SEED)

    records = []
    all_names = BANGLA_NAMES_MALE + BANGLA_NAMES_FEMALE

    print(f"Generating {target_count} synthetic land records across {len(MOUZAS)} mouzas (fixed seed={SEED})...")

    # Tracking khatian and dag sequences per mouza to create realistic clusters
    mouza_state = {m["jl_no"] + "_" + m["upazila"]: {"khatian": 101, "dag": 501} for m in MOUZAS}

    # 1. Base generation (~4,200 records)
    for i in range(1, 4201):
        mouza = random.choice(MOUZAS)
        m_key = mouza["jl_no"] + "_" + mouza["upazila"]

        khatian_int = mouza_state[m_key]["khatian"]
        dag_int = mouza_state[m_key]["dag"]

        # Advance state with occasional branching
        if random.random() < 0.35:
            # Multi-parcel khatian
            dag_int += 1
        else:
            khatian_int += 1
            dag_int += random.randint(1, 4)

        mouza_state[m_key]["khatian"] = khatian_int
        mouza_state[m_key]["dag"] = dag_int

        # Owners (1 to 3 co-owners)
        num_owners = random.choices([1, 2, 3], weights=[0.65, 0.25, 0.10])[0]
        chosen_owners = random.sample(all_names, num_owners)

        area_dec = round(random.uniform(2.5, 95.0), 2)
        survey_type = random.choice(SURVEY_TYPES)

        record_id = f"LR-SYN-{i:06d}"

        rec = {
            "id": str(uuid.uuid5(uuid.NAMESPACE_DNS, record_id)),
            "record_no": record_id,
            "mouza_jl": mouza["jl_no"],
            "mouza_name_bn": mouza["name_bn"],
            "mouza_name_en": mouza["name_en"],
            "upazila": mouza["upazila"],
            "district": mouza["district"],
            "division": mouza["division"],
            "survey_type": survey_type,
            "khatian_no": to_bn_digits(khatian_int),
            "khatian_no_raw": str(khatian_int),
            "dag_no": to_bn_digits(dag_int),
            "dag_no_raw": str(dag_int),
            "owner_names_bn": ", ".join(chosen_owners),
            "land_type": random.choice(LAND_CLASSES_BN),
            "area_decimal": area_dec,
            "area_acres": round(area_dec / 100.0, 4),
            "source_ref": "SYNTHETIC-DEMO",
            "version": 1,
            "trust_status": "POSSIBLE_MATCH",
            "is_duplicate_cluster": False
        }
        records.append(rec)

    # 2. Inject deliberate near-duplicates & name variations (~1,000+ records)
    print("Injecting deliberate near-duplicates and similar Bengali names...")
    dupe_sources = random.sample(records, 1050)
    
    current_idx = len(records) + 1
    for src in dupe_sources:
        # Clone record with deliberate perturbations
        dupe_type = random.choice(["name_variant", "survey_shift", "area_correction", "co_owner_share"])
        new_rec = dict(src)
        
        record_id = f"LR-SYN-{current_idx:06d}"
        new_rec["id"] = str(uuid.uuid5(uuid.NAMESPACE_DNS, record_id))
        new_rec["record_no"] = record_id
        new_rec["version"] = src["version"] + 1
        new_rec["is_duplicate_cluster"] = True

        if dupe_type == "name_variant":
            # Modify owner name with known phonetic / honorific variant
            original_owner = src["owner_names_bn"].split(",")[0].strip()
            variants = SIMILAR_NAME_VARIANTS.get(original_owner, [original_owner + " (অভিভাবক)", "মোঃ " + original_owner])
            new_rec["owner_names_bn"] = random.choice(variants)
            new_rec["trust_status"] = "USER_CORRECTED"

        elif dupe_type == "survey_shift":
            # Same dag number shifted from SA to RS or BS survey
            other_surveys = [s for s in SURVEY_TYPES if s != src["survey_type"]]
            new_rec["survey_type"] = random.choice(other_surveys)
            new_rec["khatian_no"] = to_bn_digits(int(src["khatian_no_raw"]) + 50)
            new_rec["trust_status"] = "POSSIBLE_MATCH"

        elif dupe_type == "area_correction":
            # Fractional decimal discrepancy
            new_rec["area_decimal"] = round(src["area_decimal"] + random.uniform(-0.5, 0.5), 2)
            new_rec["area_acres"] = round(new_rec["area_decimal"] / 100.0, 4)
            new_rec["trust_status"] = "VERIFICATION_REQUIRED"

        elif dupe_type == "co_owner_share":
            # Same khatian with partition dag
            new_rec["dag_no"] = to_bn_digits(int(src["dag_no_raw"]) + 1)
            new_rec["dag_no_raw"] = str(int(src["dag_no_raw"]) + 1)
            new_rec["trust_status"] = "POSSIBLE_MATCH"

        records.append(new_rec)
        current_idx += 1

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(records)} records saved to {output_path}.")
    return records

if __name__ == "__main__":
    generate_5000_records()
