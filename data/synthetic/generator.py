"""
Synthetic Land Records Generator for Bangladesh LandOS.
Generates realistic Khatians, Dag parcels, and ownership chains in Bengali.
"""

import json
import random

FIRST_NAMES = ["আব্দুল", "মোহাম্মদ", "আফসার", "নুরুল", "ফাতেমা", "রোকেয়া", "কামাল", "শাহানাজ", "মোকাররম", "জয়নাল"]
LAST_NAMES = ["করিম", "উদ্দিন", "হোসেন", "ইসলাম", "খান", "চৌধুরী", "তালুকদার", "মিয়া", "বেগম", "আহমেদ"]
MOUZAS = [
    {"jl_no": "০৪", "name_bn": "তেজগাঁও", "name_en": "Tejgaon", "upazila": "Tejgaon", "district": "Dhaka"},
    {"jl_no": "১২", "name_bn": "মিরপুর", "name_en": "Mirpur", "upazila": "Mirpur", "district": "Dhaka"},
    {"jl_no": "২৮", "name_bn": "বাড্ডা", "name_en": "Badda", "upazila": "Gulshan", "district": "Dhaka"},
    {"jl_no": "১৫", "name_bn": "মতিঝিল", "name_en": "Motijheel", "upazila": "Motijheel", "district": "Dhaka"},
]
LAND_CLASSES = ["নাল (Nal)", "ভিটি (Viti)", "বাড়ি (Bari)", "বাগান (Bagan)", "পুকুর (Pond)", "দোকান (Commercial)"]
SURVEY_TYPES = ["CS", "SA", "RS", "BS", "City Survey"]

def generate_synthetic_records(count=20):
    records = []
    for i in range(1, count + 1):
        mouza = random.choice(MOUZAS)
        owners = [f"{random.choice(FIRST_NAMES)} {random.choice(LAST_NAMES)}" for _ in range(random.randint(1, 3))]
        record = {
            "record_no": f"LR-2024-{1000 + i}",
            "mouza_jl": mouza["jl_no"],
            "mouza_name_bn": mouza["name_bn"],
            "survey_type": random.choice(SURVEY_TYPES),
            "khatian_no": str(random.randint(100, 9999)),
            "dag_no": str(random.randint(100, 8888)),
            "owner_names_bn": ", ".join(owners),
            "land_class_bn": random.choice(LAND_CLASSES),
            "area_acres": round(random.uniform(0.05, 3.50), 3),
            "trust_status": "POSSIBLE_MATCH",
            "is_synthetic_demo": True
        }
        records.append(record)
    return records

if __name__ == "__main__":
    records = generate_synthetic_records(30)
    print(f"Generated {len(records)} synthetic land records.")
    with open("data/seed/sample_khatians.json", "w", encoding="utf-8") as f:
        json.dump(records, f, ensure_ascii=False, indent=2)
    print("Saved to data/seed/sample_khatians.json")
