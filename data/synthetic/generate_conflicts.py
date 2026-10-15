"""
Synthetic Conflict & Risk Scenario Generator for Bangladesh LandOS.
Generates 150 cadastral parcels with labeled conflict ground-truth:
- ~30% contain seeded, labeled conflicts across R1 to R6.
- Each rule has 10+ positive conflict cases and 10+ look-alike negative cases.
- Ground truth is stored in data/synthetic/conflict_truth.json for evaluation gates.
"""

from datetime import datetime, timedelta, timezone
import json
import os
import random
from typing import Any, Dict, List

random.seed(42)

MOUZAS_SAMPLE = [
    {"name_bn": "তেজগাঁও", "name_en": "Tejgaon", "region": "DHAKA"},
    {"name_bn": "গুলশান", "name_en": "Gulshan", "region": "DHAKA"},
    {"name_bn": "মিরপুর", "name_en": "Mirpur", "region": "DHAKA"},
    {"name_bn": "কোতোয়ালি", "name_en": "Kotwali", "region": "CHITTAGONG"},
    {"name_bn": "বুড়িচং", "name_en": "Burichang", "region": "CHITTAGONG"},
    {"name_bn": "বোয়ালিয়া", "name_en": "Boalia", "region": "RAJSHAHI"},
    {"name_bn": "সিলেট সদর", "name_en": "Sylhet Sadar", "region": "SYLHET"},
    {"name_bn": "রূপগঞ্জ", "name_en": "Rupganj", "region": "DHAKA"},
]

NAMES_SAMPLE = [
    ("মোঃ আব্দুল করিম", "আব্দুল করিম"),
    ("মোছাঃ ফাতেমা খাতুন", "ফাতেমা খাতুন"),
    ("রফিকুল ইসলাম চৌধুরী", "রফিকুল ইসলাম"),
    ("সুবোধ কুমার দাস", "সুবোধ দাস"),
    ("আনোয়ার হোসেন খান", "আনোয়ার হোসেন"),
    ("বেগম রহিমা খাতুন", "রহিমা খাতুন"),
    ("ড. আমিনুল হক", "আমিনুল হক"),
    ("কামাল উদ্দিন আহমেদ", "কামাল উদ্দিন"),
    ("মুহাম্মদ জসীম উদ্দীন", "জসীম উদ্দীন"),
    ("মোসাম্মৎ আয়েশা সিদ্দিকা", "আয়েশা সিদ্দিকা"),
    ("শাহ আলম খন্দকার", "শাহ আলম"),
    ("মোঃ তারেক রহমান", "তারেক রহমান"),
]


def generate_scenarios(output_path: str = "data/synthetic/conflict_truth.json") -> Dict[str, Any]:
    parcels: List[Dict[str, Any]] = []
    rule_truth: Dict[str, Dict[str, List[str]]] = {
        "R1_conflicting_sale": {"positives": [], "negatives": []},
        "R2_duplicate_deed_reference": {"positives": [], "negatives": []},
        "R3_impossible_dates": {"positives": [], "negatives": []},
        "R4_area_mismatch": {"positives": [], "negatives": []},
        "R5_deed_mutation_inconsistency": {"positives": [], "negatives": []},
        "R6_party_name_mismatch": {"positives": [], "negatives": []},
    }

    base_date = datetime(2020, 1, 15, tzinfo=timezone.utc)
    all_global_deeds: List[Dict[str, Any]] = []

    # Prepare 150 parcel templates
    for idx in range(1, 151):
        pid = f"PARCEL-{idx:03d}"
        mouza = MOUZAS_SAMPLE[idx % len(MOUZAS_SAMPLE)]
        main_no = 1000 + idx
        sub_no = 1 if (idx % 3 == 0) else None
        base_area = round(10.0 + (idx % 40) * 1.5, 2)  # e.g. 10.0 to 70.0 decimal

        owner_pair = NAMES_SAMPLE[idx % len(NAMES_SAMPLE)]
        owner_name = owner_pair[0]

        record_data = {
            "id": f"REC-{idx:04d}",
            "khatian_no": f"{200 + idx}",
            "dag_no": f"{main_no}/{sub_no}" if sub_no else f"{main_no}",
            "owner_names_bn": owner_name,
            "area_decimal": base_area,
            "area_acres": round(base_area / 100.0, 4),
            "land_class_bn": "নাল/কৃষি",
        }

        parcel = {
            "parcel_id": pid,
            "mouza_name": mouza["name_bn"],
            "region_code": mouza["region"],
            "main_no": main_no,
            "sub_no": sub_no,
            "area_decimal": base_area,
            "record": record_data,
            "deeds": [],
            "mutations": [],
            "documents": [],
            "expected_conflicts": [],
            "is_conflict": False,
        }
        parcels.append(parcel)

    # --------------------------------------------------------------------------
    # R1: Conflicting Sale (10 positives, 10 negatives)
    # Positives: PARCEL-001 to PARCEL-010
    # Negatives: PARCEL-011 to PARCEL-020
    # --------------------------------------------------------------------------
    for idx in range(1, 11):
        p = parcels[idx - 1]
        p["is_conflict"] = True
        p["expected_conflicts"].append("R1_conflicting_sale")
        rule_truth["R1_conflicting_sale"]["positives"].append(p["parcel_id"])

        d1_date = base_date + timedelta(days=idx * 20)
        # Concurrent sale within 60 days to different buyer OR broken chain
        d2_date = d1_date + timedelta(days=45) if idx <= 6 else d1_date + timedelta(days=220)

        s1, b1 = "আব্দুল করিম", "রফিকুল ইসলাম"
        s2, b2 = ("আব্দুল করিম", "মোছাঃ ফাতেমা খাতুন") if idx <= 6 else ("সুবোধ কুমার দাস", "ফাতেমা খাতুন")

        p["deeds"].extend([
            {
                "id": f"DEED-{p['parcel_id']}-1",
                "deed_no": f"D-10{idx}",
                "deed_type": "sale",
                "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
                "deed_date": d1_date.isoformat(),
                "registered_date": (d1_date + timedelta(days=2)).isoformat(),
                "seller": s1,
                "buyer": b1,
                "area": p["area_decimal"],
            },
            {
                "id": f"DEED-{p['parcel_id']}-2",
                "deed_no": f"D-20{idx}",
                "deed_type": "sale",
                "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
                "deed_date": d2_date.isoformat(),
                "registered_date": (d2_date + timedelta(days=2)).isoformat(),
                "seller": s2,
                "buyer": b2,
                "area": p["area_decimal"],
            },
        ])

    for idx in range(11, 21):
        p = parcels[idx - 1]
        rule_truth["R1_conflicting_sale"]["negatives"].append(p["parcel_id"])
        # Legitimate chain: A sells to B, then B sells to C after 1 year
        d1_date = base_date + timedelta(days=idx * 20)
        d2_date = d1_date + timedelta(days=365)
        p["deeds"].extend([
            {
                "id": f"DEED-{p['parcel_id']}-1",
                "deed_no": f"D-LEG-{idx}-1",
                "deed_type": "sale",
                "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
                "deed_date": d1_date.isoformat(),
                "registered_date": (d1_date + timedelta(days=3)).isoformat(),
                "seller": "মোঃ আব্দুল করিম",
                "buyer": "রফিকুল ইসলাম",
                "area": p["area_decimal"],
            },
            {
                "id": f"DEED-{p['parcel_id']}-2",
                "deed_no": f"D-LEG-{idx}-2",
                "deed_type": "sale",
                "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
                "deed_date": d2_date.isoformat(),
                "registered_date": (d2_date + timedelta(days=3)).isoformat(),
                "seller": "রফিকুল ইসলাম",  # Legitimate seller is prev buyer
                "buyer": "ফাতেমা খাতুন",
                "area": p["area_decimal"],
            },
        ])

    # --------------------------------------------------------------------------
    # R2: Duplicate Deed Reference (10 positives, 10 negatives)
    # Positives: PARCEL-021 to PARCEL-030
    # Negatives: PARCEL-031 to PARCEL-040
    # --------------------------------------------------------------------------
    for idx in range(21, 31):
        p = parcels[idx - 1]
        p["is_conflict"] = True
        p["expected_conflicts"].append("R2_duplicate_deed_reference")
        rule_truth["R2_duplicate_deed_reference"]["positives"].append(p["parcel_id"])

        dup_deed_no = f"DUP-99{idx}"
        dup_date = datetime(2021, 5, 10, tzinfo=timezone.utc).isoformat()
        reg_office = f"তেজগাঁও সাব-রেজিস্ট্রি অফিস"

        deed_local = {
            "id": f"DEED-{p['parcel_id']}-A",
            "deed_no": dup_deed_no,
            "deed_type": "sale",
            "registry_office": reg_office,
            "deed_date": dup_date,
            "registered_date": dup_date,
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "parcel_id": p["parcel_id"],
            "area": p["area_decimal"],
        }
        deed_foreign = {
            "id": f"DEED-FOREIGN-{idx}",
            "deed_no": dup_deed_no,  # Identical deed no, office, year
            "deed_type": "sale",
            "registry_office": reg_office,
            "deed_date": dup_date,
            "registered_date": dup_date,
            "seller": "সুবোধ কুমার দাস",
            "buyer": "ফাতেমা খাতুন",
            "parcel_id": f"PARCEL-DISPARATE-{idx}",
            "area": p["area_decimal"],
        }
        p["deeds"].append(deed_local)
        p["all_registry_deeds"] = [deed_foreign]
        all_global_deeds.extend([deed_local, deed_foreign])

    for idx in range(31, 41):
        p = parcels[idx - 1]
        rule_truth["R2_duplicate_deed_reference"]["negatives"].append(p["parcel_id"])
        # Same deed number in DIFFERENT years or DIFFERENT offices -> Legitimate
        deed_a = {
            "id": f"DEED-{p['parcel_id']}-A",
            "deed_no": f"UNIQ-{idx}",
            "deed_type": "sale",
            "registry_office": "মিরপুর সাব-রেজিস্ট্রি অফিস",
            "deed_date": datetime(2019, 3, 1, tzinfo=timezone.utc).isoformat(),
            "registered_date": datetime(2019, 3, 5, tzinfo=timezone.utc).isoformat(),
            "seller": "কামাল উদ্দিন",
            "buyer": "আনোয়ার হোসেন",
            "parcel_id": p["parcel_id"],
            "area": p["area_decimal"],
        }
        deed_b = {
            "id": f"DEED-OTHER-{idx}",
            "deed_no": f"UNIQ-{idx}",  # Same number, different year (2022) & different office (গুলশান)
            "deed_type": "sale",
            "registry_office": "গুলশান সাব-রেজিস্ট্রি অফিস",
            "deed_date": datetime(2022, 3, 1, tzinfo=timezone.utc).isoformat(),
            "registered_date": datetime(2022, 3, 5, tzinfo=timezone.utc).isoformat(),
            "seller": "তারেক রহমান",
            "buyer": "আমিনুল হক",
            "parcel_id": f"PARCEL-OTHER-{idx}",
            "area": p["area_decimal"],
        }
        p["deeds"].append(deed_a)
        p["all_registry_deeds"] = [deed_b]

    # --------------------------------------------------------------------------
    # R3: Impossible Dates (10 positives, 10 negatives)
    # Positives: PARCEL-041 to PARCEL-050
    # Negatives: PARCEL-051 to PARCEL-060
    # --------------------------------------------------------------------------
    for idx in range(41, 51):
        p = parcels[idx - 1]
        p["is_conflict"] = True
        p["expected_conflicts"].append("R3_impossible_dates")
        rule_truth["R3_impossible_dates"]["positives"].append(p["parcel_id"])

        if idx % 3 == 0:
            # Future date
            d_date = datetime(2035, 1, 1, tzinfo=timezone.utc).isoformat()
            r_date = datetime(2035, 1, 5, tzinfo=timezone.utc).isoformat()
        elif idx % 3 == 1:
            # Registered before deed date
            d_date = datetime(2022, 6, 15, tzinfo=timezone.utc).isoformat()
            r_date = datetime(2022, 6, 1, tzinfo=timezone.utc).isoformat()  # Earlier!
        else:
            # Before 1900
            d_date = datetime(1885, 4, 10, tzinfo=timezone.utc).isoformat()
            r_date = datetime(1885, 4, 15, tzinfo=timezone.utc).isoformat()

        p["deeds"].append({
            "id": f"DEED-{p['parcel_id']}-ANOM",
            "deed_no": f"ANOM-DATE-{idx}",
            "deed_type": "sale",
            "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
            "deed_date": d_date,
            "registered_date": r_date,
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": p["area_decimal"],
        })

    for idx in range(51, 61):
        p = parcels[idx - 1]
        rule_truth["R3_impossible_dates"]["negatives"].append(p["parcel_id"])
        # Perfectly valid chronological sequence: Deed 2021-04-10 -> Reg 2021-04-12 -> Mut 2021-08-01
        d_date = datetime(2021, 4, 10, tzinfo=timezone.utc).isoformat()
        r_date = datetime(2021, 4, 12, tzinfo=timezone.utc).isoformat()
        m_date = datetime(2021, 8, 1, tzinfo=timezone.utc).isoformat()
        deed_id = f"DEED-{p['parcel_id']}-OK"

        p["deeds"].append({
            "id": deed_id,
            "deed_no": f"OK-DATE-{idx}",
            "deed_type": "sale",
            "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
            "deed_date": d_date,
            "registered_date": r_date,
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": p["area_decimal"],
        })
        p["mutations"].append({
            "id": f"MUT-{p['parcel_id']}-OK",
            "case_no": f"MUT-CASE-{idx}",
            "mutation_date": m_date,
            "deed_id": deed_id,
            "from_party": "আব্দুল করিম",
            "to_party": "রফিকুল ইসলাম",
            "area": p["area_decimal"],
        })

    # --------------------------------------------------------------------------
    # R4: Area Mismatch (10 positives, 10 negatives)
    # Positives: PARCEL-061 to PARCEL-070
    # Negatives: PARCEL-071 to PARCEL-080
    # --------------------------------------------------------------------------
    for idx in range(61, 71):
        p = parcels[idx - 1]
        p["is_conflict"] = True
        p["expected_conflicts"].append("R4_area_mismatch")
        rule_truth["R4_area_mismatch"]["positives"].append(p["parcel_id"])

        if idx % 2 == 0:
            # Beyond tolerance: Record is base_area, deed claims 40% more
            exaggerated_area = round(p["area_decimal"] * 1.40, 2)
            raw_area_str = f"{exaggerated_area} শতাংশ"
        else:
            # Regional unit without region
            raw_area_str = "২ বিঘা"
            p["region_code"] = None  # Missing region!

        p["deeds"].append({
            "id": f"DEED-{p['parcel_id']}-AR",
            "deed_no": f"D-AR-{idx}",
            "deed_type": "sale",
            "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
            "deed_date": datetime(2022, 1, 10, tzinfo=timezone.utc).isoformat(),
            "registered_date": datetime(2022, 1, 12, tzinfo=timezone.utc).isoformat(),
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": raw_area_str,
        })

    for idx in range(71, 81):
        p = parcels[idx - 1]
        rule_truth["R4_area_mismatch"]["negatives"].append(p["parcel_id"])
        # Area difference within 1.0% (tolerance is 2.0%)
        close_area = round(p["area_decimal"] * 1.008, 2)
        p["deeds"].append({
            "id": f"DEED-{p['parcel_id']}-AROK",
            "deed_no": f"D-AROK-{idx}",
            "deed_type": "sale",
            "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
            "deed_date": datetime(2022, 1, 10, tzinfo=timezone.utc).isoformat(),
            "registered_date": datetime(2022, 1, 12, tzinfo=timezone.utc).isoformat(),
            "seller": "আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": f"{close_area} শতাংশ",
        })

    # --------------------------------------------------------------------------
    # R5: Deed-Mutation Inconsistency (10 positives, 10 negatives)
    # Positives: PARCEL-081 to PARCEL-090
    # Negatives: PARCEL-091 to PARCEL-100
    # --------------------------------------------------------------------------
    for idx in range(81, 91):
        p = parcels[idx - 1]
        p["is_conflict"] = True
        p["expected_conflicts"].append("R5_deed_mutation_inconsistency")
        rule_truth["R5_deed_mutation_inconsistency"]["positives"].append(p["parcel_id"])

        if idx <= 84:
            # Party mismatch between deed and linked mutation
            deed_id = f"DEED-{p['parcel_id']}-MISM"
            p["deeds"].append({
                "id": deed_id,
                "deed_no": f"D-MUTMISM-{idx}",
                "deed_type": "sale",
                "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
                "deed_date": datetime(2021, 2, 1, tzinfo=timezone.utc).isoformat(),
                "registered_date": datetime(2021, 2, 5, tzinfo=timezone.utc).isoformat(),
                "seller": "মোঃ আব্দুল করিম",
                "buyer": "রফিকুল ইসলাম",
                "area": f"{p['area_decimal']} শতাংশ",
            })
            p["mutations"].append({
                "id": f"MUT-{p['parcel_id']}-MISM",
                "case_no": f"MC-{idx}",
                "mutation_date": datetime(2021, 6, 1, tzinfo=timezone.utc).isoformat(),
                "deed_id": deed_id,
                "from_party": "সুবোধ কুমার দাস",  # Discrepant!
                "to_party": "মোছাঃ ফাতেমা খাতুন",
                "area": f"{p['area_decimal']} শতাংশ",
            })
        elif idx <= 87:
            # Aged deed without mutation (> 730 days)
            old_date = datetime(2018, 1, 1, tzinfo=timezone.utc).isoformat()
            p["deeds"].append({
                "id": f"DEED-{p['parcel_id']}-NOMUT",
                "deed_no": f"D-NOMUT-{idx}",
                "deed_type": "sale",
                "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
                "deed_date": old_date,
                "registered_date": old_date,
                "seller": "মোঃ আব্দুল করিম",
                "buyer": "রফিকুল ইসলাম",
                "area": f"{p['area_decimal']} শতাংশ",
            })
            # No mutation attached!
        else:
            # Mutation with no deed
            p["mutations"].append({
                "id": f"MUT-{p['parcel_id']}-ORPHAN",
                "case_no": f"MC-ORPHAN-{idx}",
                "mutation_date": datetime(2022, 1, 1, tzinfo=timezone.utc).isoformat(),
                "deed_id": None,
                "from_party": "আব্দুল করিম",
                "to_party": "রফিকুল ইসলাম",
                "area": f"{p['area_decimal']} শতাংশ",
            })

    for idx in range(91, 101):
        p = parcels[idx - 1]
        rule_truth["R5_deed_mutation_inconsistency"]["negatives"].append(p["parcel_id"])
        # Perfectly consistent deed and mutation
        deed_id = f"DEED-{p['parcel_id']}-CONSIST"
        d_date = datetime(2022, 5, 1, tzinfo=timezone.utc).isoformat()
        m_date = datetime(2022, 8, 1, tzinfo=timezone.utc).isoformat()
        p["deeds"].append({
            "id": deed_id,
            "deed_no": f"D-CONSIST-{idx}",
            "deed_type": "sale",
            "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
            "deed_date": d_date,
            "registered_date": d_date,
            "seller": "মোঃ আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": f"{p['area_decimal']} শতাংশ",
        })
        p["mutations"].append({
            "id": f"MUT-{p['parcel_id']}-CONSIST",
            "case_no": f"MC-CONSIST-{idx}",
            "mutation_date": m_date,
            "deed_id": deed_id,
            "from_party": "মোঃ আব্দুল করিম",
            "to_party": "রফিকুল ইসলাম",
            "area": f"{p['area_decimal']} শতাংশ",
        })

    # --------------------------------------------------------------------------
    # R6: Party Name Mismatch (10 positives, 10 negatives)
    # Positives: PARCEL-101 to PARCEL-110
    # Negatives: PARCEL-111 to PARCEL-120
    # --------------------------------------------------------------------------
    for idx in range(101, 111):
        p = parcels[idx - 1]
        p["is_conflict"] = True
        p["expected_conflicts"].append("R6_party_name_mismatch")
        rule_truth["R6_party_name_mismatch"]["positives"].append(p["parcel_id"])

        # Document owner does not match record owner
        p["documents"].append({
            "id": f"DOC-{p['parcel_id']}-MISM",
            "doc_type": "deed",
            "owner": "শ্রী সুবোধ কুমার দাস",  # Record owner is e.g. আব্দুল করিম
            "seller": "শ্রী সুবোধ কুমার দাস",
            "buyer": "মোছাঃ ফাতেমা খাতুন",
        })

    for idx in range(111, 121):
        p = parcels[idx - 1]
        rule_truth["R6_party_name_mismatch"]["negatives"].append(p["parcel_id"])
        # Document owner matches record owner with typical honorific variant
        rec_own = p["record"]["owner_names_bn"]
        p["documents"].append({
            "id": f"DOC-{p['parcel_id']}-MATCH",
            "doc_type": "khatian",
            "owner": f"মোঃ {rec_own}",  # Normalized matches!
        })

    # Remaining PARCEL-121 to PARCEL-150 are clean normal parcels
    for idx in range(121, 151):
        p = parcels[idx - 1]
        d_date = datetime(2023, 1, 10, tzinfo=timezone.utc).isoformat()
        p["deeds"].append({
            "id": f"DEED-{p['parcel_id']}",
            "deed_no": f"D-NORM-{idx}",
            "deed_type": "sale",
            "registry_office": f"{p['mouza_name']} সাব-রেজিস্ট্রি অফিস",
            "deed_date": d_date,
            "registered_date": d_date,
            "seller": "মোঃ আব্দুল করিম",
            "buyer": "রফিকুল ইসলাম",
            "area": f"{p['area_decimal']} শতাংশ",
        })

    truth_payload = {
        "total_parcels": len(parcels),
        "total_conflicts": sum(1 for p in parcels if p["is_conflict"]),
        "conflict_ratio": round(sum(1 for p in parcels if p["is_conflict"]) / len(parcels), 3),
        "rule_truth": rule_truth,
        "parcels": parcels,
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(truth_payload, f, ensure_ascii=False, indent=2)

    print(f"Generated {len(parcels)} parcels ({truth_payload['total_conflicts']} conflicts, {truth_payload['conflict_ratio']*100:.1f}%).")
    print(f"Saved ground truth to {output_path}")
    return truth_payload


if __name__ == "__main__":
    generate_scenarios()
