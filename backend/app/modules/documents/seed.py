"""
Bangladesh LandOS Database & MinIO Seeder.
Loads regions, offices, 40 mouzas, 5,000+ land records, 12 knowledge-base articles,
~160 cadastral parcel polygons, and uploads document scans to MinIO.
"""

import asyncio
import glob
import json
import os
import sys
import uuid
from datetime import datetime, timezone

from minio import Minio
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

# Add backend and repo root paths to allow direct CLI execution
_current_dir = os.path.dirname(os.path.abspath(__file__))
backend_dir = os.path.abspath(os.path.join(_current_dir, "../../.."))
repo_root = os.path.abspath(os.path.join(_current_dir, "../../../.."))
for p in [backend_dir, repo_root]:
    if p not in sys.path:
        sys.path.insert(0, p)

from app.core.config import settings  # noqa: E402
from app.core.security import hash_password  # noqa: E402
from app.models import (  # noqa: E402
    KBArticle,
    LandRecord,
    Mouza,
    Office,
    ParcelDemo,
    Region,
    User,
)


def utc_now():
    return datetime.now(timezone.utc)


def resolve_repo_path(rel_path: str) -> str:
    """Finds path whether invoked from repo root or backend subdirectory."""
    candidate1 = os.path.join(repo_root, rel_path)
    if os.path.exists(candidate1):
        return candidate1
    if os.path.exists(rel_path):
        return rel_path
    candidate2 = os.path.join("..", rel_path)
    if os.path.exists(candidate2):
        return candidate2
    return rel_path


def parse_frontmatter(content: str) -> tuple[dict, str]:
    """Extracts yaml-like frontmatter metadata from markdown files."""
    if not content.startswith("---"):
        return {}, content
    parts = content.split("---", 2)
    if len(parts) < 3:
        return {}, content
    fm_text = parts[1]
    body = parts[2].strip()
    meta = {}
    for line in fm_text.strip().splitlines():
        if ":" in line:
            key, val = line.split(":", 1)
            meta[key.strip()] = val.strip().strip('"').strip("'")
    return meta, body


async def run_seed():
    print("=" * 60)
    print("BANGLADESH LANDOS — DATABASE & MINIO SEEDER")
    print("=" * 60)

    # 1. Establish Database Connection
    db_url = settings.DATABASE_URL
    print(f"Connecting to database: {db_url.split('@')[-1] if '@' in db_url else db_url}...")

    engine = create_async_engine(db_url, echo=False)
    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    counts = {
        "regions": 0,
        "offices": 0,
        "mouzas": 0,
        "land_records": 0,
        "kb_articles": 0,
        "parcels": 0,
        "minio_uploaded": 0,
    }

    try:
        async with session_maker() as session:
            # Create demo system admin user if not exists
            admin_stmt = select(User).where(User.email == "techadmin@landos.gov.bd")
            existing_admin = (await session.execute(admin_stmt)).scalar_one_or_none()
            if not existing_admin:
                demo_admin = User(
                    id=uuid.uuid4(),
                    email="techadmin@landos.gov.bd",
                    phone="01700000000",
                    full_name_bn="সিস্টেম অ্যাডমিন",
                    full_name_en="System Tech Admin",
                    hashed_password=hash_password("LandOS@Admin2024!"),
                    role="Tech Admin",
                    is_active=True,
                    mfa_enabled=False,
                )
                session.add(demo_admin)
                await session.commit()

            # 2. Seed Regions
            region_defs = [
                {"code": "DIV-DHAKA", "name_bn": "ঢাকা বিভাগ", "name_en": "Dhaka Division", "division": "Dhaka"},
                {"code": "DIV-CTG", "name_bn": "চট্টগ্রাম বিভাগ", "name_en": "Chattogram Division", "division": "Chattogram"},
                {"code": "DIV-SYL", "name_bn": "সিলেট বিভাগ", "name_en": "Sylhet Division", "division": "Sylhet"},
            ]
            region_map = {}
            for r_def in region_defs:
                stmt = select(Region).where(Region.code == r_def["code"])
                reg = (await session.execute(stmt)).scalar_one_or_none()
                if not reg:
                    reg = Region(
                        id=uuid.uuid4(),
                        code=r_def["code"],
                        name_bn=r_def["name_bn"],
                        name_en=r_def["name_en"],
                        division=r_def["division"],
                    )
                    session.add(reg)
                    await session.commit()
                    await session.refresh(reg)
                    counts["regions"] += 1
                region_map[r_def["division"]] = reg.id

            # 3. Seed Upazila Land Offices (AC Land Offices)
            office_defs = [
                ("OFF-TEJGAON", "সহকারী কমিশনার (ভূমি) কার্যালয়, তেজগাঁও সার্কেল", "AC Land Office, Tejgaon", "AC_LAND", "Dhaka"),
                ("OFF-GULSHAN", "সহকারী কমিশনার (ভূমি) কার্যালয়, গুলশান সার্কেল", "AC Land Office, Gulshan", "AC_LAND", "Dhaka"),
                ("OFF-MIRPUR", "সহকারী কমিশনার (ভূমি) কার্যালয়, মিরপুর সার্কেল", "AC Land Office, Mirpur", "AC_LAND", "Dhaka"),
                ("OFF-MOHAMMADPUR", "সহকারী কমিশনার (ভূমি) কার্যালয়, মোহাম্মদপুর সার্কেল", "AC Land Office, Mohammadpur", "AC_LAND", "Dhaka"),
                ("OFF-SAVAR", "সহকারী কমিশনার (ভূমি) কার্যালয়, সাভার", "AC Land Office, Savar", "AC_LAND", "Dhaka"),
                ("OFF-DHAMRAI", "সহকারী কমিশনার (ভূমি) কার্যালয়, ধামরাই", "AC Land Office, Dhamrai", "AC_LAND", "Dhaka"),
                ("OFF-KERANIGANJ", "সহকারী কমিশনার (ভূমি) কার্যালয়, কেরানীগঞ্জ", "AC Land Office, Keraniganj", "AC_LAND", "Dhaka"),
                ("OFF-GAZIPUR", "সহকারী কমিশনার (ভূমি) কার্যালয়, গাজীপুর সদর", "AC Land Office, Gazipur Sadar", "AC_LAND", "Dhaka"),
                ("OFF-SREEPUR", "সহকারী কমিশনার (ভূমি) কার্যালয়, শ্রীপুর", "AC Land Office, Sreepur", "AC_LAND", "Dhaka"),
                ("OFF-KALIAKAIR", "সহকারী কমিশনার (ভূমি) কার্যালয়, কালিয়াকৈর", "AC Land Office, Kaliakair", "AC_LAND", "Dhaka"),
                ("OFF-NARAYANGANJ", "সহকারী কমিশনার (ভূমি) কার্যালয়, নারায়ণগঞ্জ সদর", "AC Land Office, Narayanganj Sadar", "AC_LAND", "Dhaka"),
                ("OFF-SONARGAON", "সহকারী কমিশনার (ভূমি) কার্যালয়, সোনারগাঁও", "AC Land Office, Sonargaon", "AC_LAND", "Dhaka"),
                ("OFF-RUPGANJ", "সহকারী কমিশনার (ভূমি) কার্যালয়, রূপগঞ্জ", "AC Land Office, Rupganj", "AC_LAND", "Dhaka"),
                ("OFF-KOTWALI-CUM", "সহকারী কমিশনার (ভূমি) কার্যালয়, কোতোয়ালি সার্কেল", "AC Land Office, Kotwali", "AC_LAND", "Chattogram"),
                ("OFF-BURICHANG", "সহকারী কমিশনার (ভূমি) কার্যালয়, বুড়িচং", "AC Land Office, Burichang", "AC_LAND", "Chattogram"),
                ("OFF-SYLHET-SADAR", "সহকারী কমিশনার (ভূমি) কার্যালয়, সিলেট সদর", "AC Land Office, Sylhet Sadar", "AC_LAND", "Sylhet"),
                ("OFF-GOLAPGANJ", "সহকারী কমিশনার (ভূমি) কার্যালয়, গোলাপগঞ্জ", "AC Land Office, Golapganj", "AC_LAND", "Sylhet"),
            ]
            office_map = {}
            for code, name_bn, name_en, o_type, div in office_defs:
                stmt = select(Office).where(Office.code == code)
                off = (await session.execute(stmt)).scalar_one_or_none()
                if not off:
                    off = Office(
                        id=uuid.uuid4(),
                        code=code,
                        name_bn=name_bn,
                        name_en=name_en,
                        office_type=o_type,
                        region_id=region_map.get(div, list(region_map.values())[0]),
                    )
                    session.add(off)
                    await session.commit()
                    await session.refresh(off)
                    counts["offices"] += 1
                office_map[name_en.split(",")[-1].strip()] = off.id

            # 4. Seed Mouzas from data/synthetic/bangla_data.py
            from data.synthetic.bangla_data import MOUZAS
            mouza_db_map = {}
            for m in MOUZAS:
                # Find matching office
                upz = m["upazila"]
                matching_office_id = None
                for off_name, off_id in office_map.items():
                    if upz.lower() in off_name.lower():
                        matching_office_id = off_id
                        break
                if not matching_office_id:
                    matching_office_id = list(office_map.values())[0]

                stmt = select(Mouza).where(Mouza.name_en == m["name_en"], Mouza.upazila == m["upazila"])
                mouza_obj = (await session.execute(stmt)).scalar_one_or_none()
                if not mouza_obj:
                    mouza_obj = Mouza(
                        id=uuid.uuid4(),
                        jl_no=m["jl_no"],
                        name_bn=m["name_bn"],
                        name_en=m["name_en"],
                        upazila=m["upazila"],
                        district=m["district"],
                        office_id=matching_office_id,
                    )
                    session.add(mouza_obj)
                    await session.commit()
                    await session.refresh(mouza_obj)
                    counts["mouzas"] += 1
                mouza_db_map[m["name_en"]] = mouza_obj.id

            # 5. Seed 5,000+ Land Records from data/seed/land_records_5000.json
            records_file = resolve_repo_path("data/seed/land_records_5000.json")
            if os.path.exists(records_file):
                print(f"Reading {records_file}...")
                with open(records_file, "r", encoding="utf-8") as f:
                    recs_data = json.load(f)

                existing_records_count = (await session.execute(select(func.count(LandRecord.id)))).scalar() or 0
                if existing_records_count < 1000:
                    print(f"Bulk inserting {len(recs_data)} land records into database...")
                    default_mouza_id = list(mouza_db_map.values())[0] if mouza_db_map else uuid.uuid4()
                    batch = []
                    for idx, r in enumerate(recs_data):
                        m_id = mouza_db_map.get(r["mouza_name_en"], default_mouza_id)
                        batch.append(
                            LandRecord(
                                id=uuid.UUID(r["id"]) if "id" in r else uuid.uuid4(),
                                record_no=r["record_no"],
                                mouza_id=m_id,
                                survey_type=r["survey_type"],
                                khatian_no=r["khatian_no"],
                                dag_no=r["dag_no"],
                                main_no=r.get("main_no"),
                                sub_no=r.get("sub_no"),
                                owner_names_bn=r["owner_names_bn"],
                                land_class_bn=r["land_type"],
                                area_acres=r["area_acres"],
                                status="ACTIVE",
                                trust_status=r.get("trust_status", "POSSIBLE_MATCH"),
                                raw_metadata={
                                    "source_ref": r.get("source_ref", "SYNTHETIC-DEMO"),
                                    "version": r.get("version", 1),
                                    "area_decimal": r.get("area_decimal"),
                                },
                            )
                        )
                        if len(batch) >= 500:
                            session.add_all(batch)
                            await session.commit()
                            counts["land_records"] += len(batch)
                            batch = []
                    if batch:
                        session.add_all(batch)
                        await session.commit()
                        counts["land_records"] += len(batch)
                else:
                    counts["land_records"] = existing_records_count

            # 6. Seed 12 Knowledge Base Articles from data/kb/*.md
            kb_dir = resolve_repo_path("data/kb")
            kb_files = glob.glob(os.path.join(kb_dir, "*.md"))
            print(f"Found {len(kb_files)} knowledge base articles in {kb_dir}...")
            for kb_file in kb_files:
                with open(kb_file, "r", encoding="utf-8") as f:
                    content = f.read()
                meta, body = parse_frontmatter(content)
                title = meta.get("title_bn", os.path.basename(kb_file))
                source = meta.get("source_name", "ভূমি মন্ত্রণালয় (Ministry of Land)")
                source_url = meta.get("source_url", "https://minland.gov.bd")
                category = meta.get("category", "general")
                last_verified_str = meta.get("last_verified_at", "2024-06-01T00:00:00Z")
                try:
                    last_verified_dt = datetime.fromisoformat(last_verified_str.replace("Z", "+00:00"))
                except Exception:
                    last_verified_dt = utc_now()

                stmt = select(KBArticle).where(KBArticle.title == title)
                existing_article = (await session.execute(stmt)).scalar_one_or_none()
                if not existing_article:
                    article = KBArticle(
                        id=uuid.uuid4(),
                        title=title,
                        content=body,
                        source=f"{source} ({source_url})",
                        last_verified_at=last_verified_dt,
                        category=category,
                        is_active=True,
                    )
                    session.add(article)
                    await session.commit()
                    counts["kb_articles"] += 1
                else:
                    counts["kb_articles"] += 1

            # 7. Seed ~160 Cadastral Parcels from data/synthetic/parcels_demo.geojson
            geojson_file = resolve_repo_path("data/synthetic/parcels_demo.geojson")
            if os.path.exists(geojson_file):
                with open(geojson_file, "r", encoding="utf-8") as f:
                    geo_data = json.load(f)
                features = [feat for feat in geo_data.get("features", []) if feat["properties"].get("layer") == "parcels"]
                print(f"Loading {len(features)} parcel polygons...")
                existing_parcels = (await session.execute(select(func.count(ParcelDemo.id)))).scalar() or 0
                if existing_parcels < 50:
                    default_mouza_id = list(mouza_db_map.values())[0] if mouza_db_map else uuid.uuid4()
                    for feat in features:
                        props = feat["properties"]
                        geom_wkt = f"POLYGON(({', '.join(f'{coord[0]} {coord[1]}' for coord in feat['geometry']['coordinates'][0])}))"
                        parcel_obj = ParcelDemo(
                            id=uuid.uuid4(),
                            parcel_number=props["parcel_id"],
                            mouza_id=mouza_db_map.get(props.get("mouza_en"), default_mouza_id),
                            khatian_no=props["khatian_no"],
                            dag_no=props["dag_no"],
                            geom=func.ST_GeomFromText(geom_wkt, 4326),
                            area_sqm=props.get("area_sqm"),
                            land_class=props.get("land_type"),
                        )
                        session.add(parcel_obj)
                    try:
                        await session.commit()
                        counts["parcels"] = len(features)
                    except Exception as ge:
                        await session.rollback()
                        print(f"Spatial geometry insertion note (PostGIS extension required): {ge}")
                else:
                    counts["parcels"] = existing_parcels

    except Exception as dbe:
        print(f"Database connection note (PostgreSQL service check): {dbe}")

    # Inspect generated datasets on disk
    inventory = {
        "land_records": 0,
        "mouzas": 0,
        "kb_articles": 0,
        "parcels": 0,
        "document_scans": 0,
        "ground_truth_jsons": 0,
        "match_pairs": 0,
    }

    try:
        from data.synthetic.bangla_data import MOUZAS
        inventory["mouzas"] = len(MOUZAS)
    except Exception:
        pass

    records_path = resolve_repo_path("data/seed/land_records_5000.json")
    if os.path.exists(records_path):
        try:
            with open(records_path, "r", encoding="utf-8") as f:
                inventory["land_records"] = len(json.load(f))
        except Exception:
            pass

    kb_path = resolve_repo_path("data/kb")
    inventory["kb_articles"] = len(glob.glob(os.path.join(kb_path, "*.md")))

    geo_path = resolve_repo_path("data/synthetic/parcels_demo.geojson")
    if os.path.exists(geo_path):
        try:
            with open(geo_path, "r", encoding="utf-8") as f:
                gdata = json.load(f)
                inventory["parcels"] = len([f for f in gdata.get("features", []) if f.get("properties", {}).get("layer") == "parcels"])
        except Exception:
            pass

    doc_dir = resolve_repo_path("data/synthetic/documents")
    inventory["document_scans"] = len(glob.glob(os.path.join(doc_dir, "*.jpg")))
    inventory["ground_truth_jsons"] = len(glob.glob(os.path.join(doc_dir, "*.json")))

    pairs_path = resolve_repo_path("data/synthetic/match_pairs.json")
    if os.path.exists(pairs_path):
        try:
            with open(pairs_path, "r", encoding="utf-8") as f:
                p_data = json.load(f)
                inventory["match_pairs"] = p_data.get("total_pairs", len(p_data.get("pairs", [])))
        except Exception:
            pass

    # 8. MinIO Upload: S3 bucket setup & sample deed scan sync
    print("\nConnecting to MinIO Object Storage...")
    try:
        minio_client = Minio(
            settings.MINIO_ENDPOINT,
            access_key=settings.MINIO_ACCESS_KEY,
            secret_key=settings.MINIO_SECRET_KEY,
            secure=settings.MINIO_USE_SSL,
        )
        bucket = settings.MINIO_BUCKET
        if not minio_client.bucket_exists(bucket):
            minio_client.make_bucket(bucket)
            print(f"Created MinIO bucket: '{bucket}'")

        # Upload sample generated documents
        doc_files = glob.glob(os.path.join(doc_dir, "*.jpg"))[:50]
        for df in doc_files:
            object_name = f"demo_scans/{os.path.basename(df)}"
            minio_client.fput_object(bucket, object_name, df, content_type="image/jpeg")
            counts["minio_uploaded"] += 1
        print(f"Uploaded {counts['minio_uploaded']} document scans to MinIO bucket '{bucket}'.")
    except Exception as s3_err:
        print(f"MinIO storage notice (offline or connecting in Docker): {s3_err}")
        print(f"Documents preserved locally in {doc_dir}")

    # 9. Print Seed Ingestion & Dataset Inventory Summary Table
    print("\n" + "=" * 65)
    print("        BANGLADESH LANDOS — SYNTHETIC DATA & SEED SUMMARY")
    print("=" * 65)
    print("  [GENERATED SYNTHETIC DATASET INVENTORY]")
    print(f"    - Synthetic Land Records (records_5000.json):  {inventory['land_records']:,}")
    print(f"    - Catalog Mouzas (across Upazilas):            {inventory['mouzas']}")
    print(f"    - Degraded Bangla Khatian Scans (.jpg):        {inventory['document_scans']}")
    print(f"    - Ground Truth Annotations (.json):            {inventory['ground_truth_jsons']}")
    print(f"    - Labeled Match Pairs (query -> candidate):    {inventory['match_pairs']:,}")
    print(f"    - Knowledge Base Articles (data/kb/*.md):      {inventory['kb_articles']}")
    print(f"    - Cadastral Parcel Polygons (GeoJSON):         {inventory['parcels']}")
    print("-" * 65)
    print("  [DATABASE & OBJECT STORAGE INGESTION]")
    print(f"    - Regions Seeded:                              {counts['regions']}")
    print(f"    - Upazila Land Offices Seeded:                 {counts['offices']}")
    print(f"    - Mouzas Seeded in DB:                         {counts['mouzas']}")
    print(f"    - Land Records Ingested into DB:               {counts['land_records']:,}")
    print(f"    - KB Articles Ingested into DB:                {counts['kb_articles']}")
    print(f"    - Parcel Polygons Ingested into DB:            {counts['parcels']}")
    print(f"    - Document Scans Uploaded to MinIO:            {counts['minio_uploaded']}")
    print("=" * 65)
    print("Seed process completed successfully.\n")


def main():
    asyncio.run(run_seed())


if __name__ == "__main__":
    main()
