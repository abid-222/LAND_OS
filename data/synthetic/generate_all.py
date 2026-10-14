"""
Master Generator Script: Executes full generation pipeline deterministically.
"""


from generate_records import generate_5000_records
from generate_parcels import generate_parcels_geojson
from generate_match_pairs import generate_match_pairs

def run_all():
    print("=" * 60)
    print("BANGLADESH LANDOS — SYNTHETIC DATA GENERATION PIPELINE")
    print("=" * 60)
    
    # 1. Land Records (5,000+ with deliberate near-duplicates)
    records = generate_5000_records()
    print(f"[OK] Generated {len(records)} Land Records.\n")

    # 2. Parcels GeoJSON (~160 parcels + roads + water)
    parcels = generate_parcels_geojson()
    print(f"[OK] Generated {len(parcels['features'])} Geospatial Features.\n")

    # 3. Match Pairs (1,200 labeled pairs)
    pairs = generate_match_pairs()
    print(f"[OK] Generated {len(pairs)} Labeled Match Pairs.\n")

    print("=" * 60)
    print("All synthetic datasets generated successfully.")
    print("=" * 60)

if __name__ == "__main__":
    run_all()
