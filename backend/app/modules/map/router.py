"""
Geospatial Cadastral Parcel Visualizer Router for Bangladesh LandOS.
Endpoints:
- GET /api/v1/map/parcels?bbox=  (GeoJSON, is_illustrative=true)
- GET /api/v1/map/parcels/{synthetic_id}
Public reference data cached in Redis.
"""

import json
import os
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.cache import get_cached_public_data, set_cached_public_data
from app.core.database import get_db
from app.models import StatusLabel

router = APIRouter(prefix="/map", tags=["Geospatial Cadastral Parcel Visualizer"])

FALLBACK_GEOJSON_PATH = os.path.abspath(
    os.path.join(os.path.dirname(__file__), "../../../../data/synthetic/parcels_demo.geojson")
)


def _load_fallback_parcels() -> List[Dict[str, Any]]:
    """Loads bundled synthetic cadastral parcels demo GeoJSON along with built-in demo parcels."""
    loaded_features: List[Dict[str, Any]] = []
    if os.path.exists(FALLBACK_GEOJSON_PATH):
        try:
            with open(FALLBACK_GEOJSON_PATH, "r", encoding="utf-8") as f:
                data = json.load(f)
                loaded_features = data.get("features", [])
        except Exception:
            pass

    # Built-in demo parcels
    built_in = [
        {
            "type": "Feature",
            "properties": {
                "synthetic_id": "P-4520",
                "parcel_number": "P-4520",
                "dag_no": "৪৫২০",
                "khatian_no": "১২০৫",
                "mouza": "Tejgaon",
                "area_acres": 0.155,
                "is_illustrative": True,
                "is_synthetic_demo": True,
                "status_label": StatusLabel.POSSIBLE_MATCH.value,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [90.395, 23.755],
                        [90.398, 23.755],
                        [90.398, 23.758],
                        [90.395, 23.758],
                        [90.395, 23.755],
                    ]
                ],
            },
        },
        {
            "type": "Feature",
            "properties": {
                "synthetic_id": "P-3201",
                "parcel_number": "P-3201",
                "dag_no": "৩২০১",
                "khatian_no": "৭৮৯",
                "mouza": "Mirpur",
                "area_acres": 0.420,
                "is_illustrative": True,
                "is_synthetic_demo": True,
                "status_label": StatusLabel.VERIFICATION_REQUIRED.value,
            },
            "geometry": {
                "type": "Polygon",
                "coordinates": [
                    [
                        [90.365, 23.805],
                        [90.369, 23.805],
                        [90.369, 23.809],
                        [90.365, 23.809],
                        [90.365, 23.805],
                    ]
                ],
            },
        },
    ]
    return built_in + loaded_features


@router.get(
    "/parcels",
    summary="Fetch cadastral parcels GeoJSON with mandatory legal boundary disclaimer",
)
async def get_parcels(
    bbox: Optional[str] = Query(
        None, description="Bounding box filter formatted as 'min_lon,min_lat,max_lon,max_lat'"
    ),
    mouza_jl: Optional[str] = Query(None, description="Mouza JL number"),
    db: AsyncSession = Depends(get_db),
):
    """
    Returns cadastral parcel boundaries in GeoJSON format.
    Every parcel is marked with `is_illustrative: true`.
    Public reference data cached in Redis.
    """
    cache_key = f"public:map:parcels:{bbox or 'all'}:{mouza_jl or 'all'}"
    cached = await get_cached_public_data(cache_key)
    if cached:
        return cached

    features = _load_fallback_parcels()

    # Bbox filter if provided
    if bbox:
        try:
            parts = [float(x.strip()) for x in bbox.split(",")]
            if len(parts) == 4:
                min_lon, min_lat, max_lon, max_lat = parts
                filtered = []
                for feat in features:
                    coords = feat.get("geometry", {}).get("coordinates", [[]])[0]
                    if coords:
                        lons = [pt[0] for pt in coords]
                        lats = [pt[1] for pt in coords]
                        if any(min_lon <= lo <= max_lon and min_lat <= la <= max_lat for lo, la in zip(lons, lats)):
                            filtered.append(feat)
                features = filtered
        except Exception:
            pass

    # Ensure is_illustrative is explicitly true on each feature
    for f in features:
        props = f.setdefault("properties", {})
        props["is_illustrative"] = True
        props["is_synthetic_demo"] = True
        if "synthetic_id" not in props:
            props["synthetic_id"] = (
                f.get("id")
                or props.get("parcel_id")
                or props.get("parcel_number")
                or "P-DEMO"
            )

    resp = {
        "type": "FeatureCollection",
        "is_illustrative": True,
        "disclaimer_bn": "প্রদর্শিত সীমানা শুধুমাত্র উদাহরণের জন্য / এটি কোনো আইনি সীমানা বা রেকর্ড নয়। ডেমো ডেটা।",
        "disclaimer_en": "Illustrative / Not a legal boundary. Synthetic demo parcels.",
        "features": features,
    }

    await set_cached_public_data(cache_key, resp, ttl_seconds=300)
    return resp


@router.get(
    "/parcels/{synthetic_id}",
    summary="Get single synthetic parcel by ID",
)
async def get_parcel_by_id(
    synthetic_id: str,
    db: AsyncSession = Depends(get_db),
):
    """
    Returns single cadastral parcel polygon detail.
    Cached as public reference data.
    """
    cache_key = f"public:map:parcels:detail:{synthetic_id}"
    cached = await get_cached_public_data(cache_key)
    if cached:
        return cached

    features = _load_fallback_parcels()
    target = None
    for f in features:
        fid = str(f.get("id") or "")
        props = f.get("properties", {})
        syn_id = str(props.get("synthetic_id") or "")
        p_id = str(props.get("parcel_id") or "")
        p_num = str(props.get("parcel_number") or "")
        dag = str(props.get("dag_no") or "")
        if synthetic_id in (fid, syn_id, p_id, p_num, dag):
            target = f
            break

    if not target:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Synthetic parcel '{synthetic_id}' not found.",
        )

    target_props = target.setdefault("properties", {})
    target_props["is_illustrative"] = True
    target_props["is_synthetic_demo"] = True
    if "synthetic_id" not in target_props:
        target_props["synthetic_id"] = (
            target.get("id")
            or target_props.get("parcel_id")
            or target_props.get("parcel_number")
            or "P-DEMO"
        )

    await set_cached_public_data(cache_key, target, ttl_seconds=300)
    return target
