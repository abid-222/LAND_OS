"""
Synthetic Geospatial Cadastral Parcel Generator.
Produces ~150 parcel polygons, roads layer, and water bodies (Turag/Buriganga + ponds) in GeoJSON.
"""

import json
import random
import os
from bangla_data import MOUZAS, LAND_CLASSES_BN, to_bn_digits

SEED = 42

def generate_parcels_geojson(output_path="data/synthetic/parcels_demo.geojson", parcel_count=160):
    random.seed(SEED)
    features = []

    # Centered near Tejgaon / Mirpur / Savar cadastral coordinate box
    base_lng = 90.3900
    base_lat = 23.7600
    grid_size = 13  # 13x13 grid ~ 169 parcels

    print(f"Generating {parcel_count} synthetic cadastral parcel polygons + roads + water layers...")

    # 1. Parcels Layer (Grid of realistic cadastral boundary polygons)
    parcel_idx = 1
    cell_w = 0.0018  # roughly 200m
    cell_h = 0.0015  # roughly 165m

    for r in range(grid_size):
        for c in range(grid_size):
            if parcel_idx > parcel_count:
                break

            mouza = random.choice(MOUZAS)
            khatian_int = random.randint(100, 4500)
            dag_int = 1000 + parcel_idx

            # Generate slightly irregular polygon with small boundary jitter
            p_lng = base_lng + (c * cell_w)
            p_lat = base_lat + (r * cell_h)

            j1 = random.uniform(-0.0001, 0.0001)
            j2 = random.uniform(-0.0001, 0.0001)
            j3 = random.uniform(-0.0001, 0.0001)
            j4 = random.uniform(-0.0001, 0.0001)

            poly_coords = [
                [round(p_lng + j1, 6), round(p_lat + j2, 6)],
                [round(p_lng + cell_w + j2, 6), round(p_lat + j1, 6)],
                [round(p_lng + cell_w + j3, 6), round(p_lat + cell_h + j4, 6)],
                [round(p_lng + j4, 6), round(p_lat + cell_h + j3, 6)],
                [round(p_lng + j1, 6), round(p_lat + j2, 6)],
            ]

            area_sqm = round(random.uniform(150.0, 3500.0), 1)
            area_decimal = round(area_sqm / 40.4686, 2)

            sample_doc_num = (parcel_idx % 300) + 1

            feature = {
                "type": "Feature",
                "id": f"parcel_{parcel_idx:04d}",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [poly_coords]
                },
                "properties": {
                    "layer": "parcels",
                    "feature_type": "parcel",
                    "parcel_id": f"BD-P-{mouza['jl_no']}-{dag_int}",
                    "khatian_no": to_bn_digits(khatian_int),
                    "dag_no": to_bn_digits(dag_int),
                    "mouza_bn": mouza["name_bn"],
                    "mouza_en": mouza["name_en"],
                    "upazila": mouza["upazila"],
                    "district": mouza["district"],
                    "land_type": random.choice(LAND_CLASSES_BN),
                    "area_decimal": area_decimal,
                    "area_sqm": area_sqm,
                    "is_illustrative": True,
                    "trust_status": random.choice(["POSSIBLE_MATCH", "OCR_EXTRACTED", "VERIFICATION_REQUIRED"]),
                    "sample_docs": [f"doc_{sample_doc_num:03d}.jpg"],
                    "legal_notice": "Illustrative / Not a legal boundary (DEMO)"
                }
            }
            features.append(feature)
            parcel_idx += 1

    # 2. Roads Layer (LineStrings traversing the mouza parcels)
    # Primary Highway
    highway_coords = [
        [round(base_lng - 0.002, 6), round(base_lat + 0.006, 6)],
        [round(base_lng + 0.010, 6), round(base_lat + 0.007, 6)],
        [round(base_lng + 0.024, 6), round(base_lat + 0.009, 6)]
    ]
    features.append({
        "type": "Feature",
        "id": "road_001",
        "geometry": {
            "type": "LineString",
            "coordinates": highway_coords
        },
        "properties": {
            "layer": "roads",
            "feature_type": "primary_highway",
            "name_bn": "মহাসড়ক (Highway - ৪ লেনে উন্নীত)",
            "name_en": "Primary Upazila Highway",
            "width_meters": 18.0
        }
    })

    # Access Lane
    access_coords = [
        [round(base_lng + 0.008, 6), round(base_lat - 0.001, 6)],
        [round(base_lng + 0.009, 6), round(base_lat + 0.010, 6)],
        [round(base_lng + 0.011, 6), round(base_lat + 0.018, 6)]
    ]
    features.append({
        "type": "Feature",
        "id": "road_002",
        "geometry": {
            "type": "LineString",
            "coordinates": access_coords
        },
        "properties": {
            "layer": "roads",
            "feature_type": "access_road",
            "name_bn": "মৌজা সংযোগ রাস্তা (Mouza Access Road)",
            "name_en": "Connecting Feeder Road",
            "width_meters": 6.5
        }
    })

    # 3. Water Bodies Layer (River & mouza pond)
    # River segment
    river_coords = [
        [
            [round(base_lng - 0.003, 6), round(base_lat + 0.015, 6)],
            [round(base_lng + 0.025, 6), round(base_lat + 0.019, 6)],
            [round(base_lng + 0.025, 6), round(base_lat + 0.022, 6)],
            [round(base_lng - 0.003, 6), round(base_lat + 0.018, 6)],
            [round(base_lng - 0.003, 6), round(base_lat + 0.015, 6)],
        ]
    ]
    features.append({
        "type": "Feature",
        "id": "water_001",
        "geometry": {
            "type": "Polygon",
            "coordinates": river_coords
        },
        "properties": {
            "layer": "water",
            "feature_type": "river",
            "name_bn": "তুরাগ নদী সংযোগ খাল (Turag Tributary)",
            "name_en": "Turag Canal Tributary"
        }
    })

    # Village Pond / Dighi
    pond_coords = [
        [
            [round(base_lng + 0.004, 6), round(base_lat + 0.003, 6)],
            [round(base_lng + 0.006, 6), round(base_lat + 0.003, 6)],
            [round(base_lng + 0.006, 6), round(base_lat + 0.005, 6)],
            [round(base_lng + 0.004, 6), round(base_lat + 0.005, 6)],
            [round(base_lng + 0.004, 6), round(base_lat + 0.003, 6)],
        ]
    ]
    features.append({
        "type": "Feature",
        "id": "water_002",
        "geometry": {
            "type": "Polygon",
            "coordinates": pond_coords
        },
        "properties": {
            "layer": "water",
            "feature_type": "pond",
            "name_bn": "মৌজা সরকারি দিঘি (Public Pond)",
            "name_en": "Cadastral Waterbody Parcel"
        }
    })

    geojson_doc = {
        "type": "FeatureCollection",
        "name": "Bangladesh LandOS Synthetic Demo Parcels & Cadastral Layers",
        "crs": {
            "type": "name",
            "properties": {"name": "urn:ogc:def:crs:OGC:1.3:CRS84"}
        },
        "disclaimer_bn": "প্রদর্শিত নকশা ও সীমানা শুধুমাত্র উদাহরণের জন্য / এটি কোনো আইনি সীমানা নয়।",
        "disclaimer_en": "Illustrative / Not a legal boundary. Synthetic demo layers.",
        "is_illustrative": True,
        "features": features
    }

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(geojson_doc, f, ensure_ascii=False, indent=2)

    parcel_count_actual = sum(1 for feat in features if feat["properties"]["layer"] == "parcels")
    print(f"Generated {parcel_count_actual} parcels, 2 roads, and 2 water features saved to {output_path}.")
    return geojson_doc

if __name__ == "__main__":
    generate_parcels_geojson()
