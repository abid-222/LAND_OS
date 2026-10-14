from typing import Optional

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db

router = APIRouter(prefix="/map", tags=["Geospatial Cadastral Parcel Visualizer"])


@router.get("/parcels", summary="Fetch GeoJSON parcels with legal boundary disclaimer")
async def get_parcels(
    mouza_jl: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
):
    # Self-generated illustrative parcels
    features = [
        {
            "type": "Feature",
            "properties": {
                "parcel_number": "P-4520",
                "dag_no": "৪৫২০",
                "khatian_no": "১২০৫",
                "mouza": "Tejgaon",
                "area_acres": 0.155,
                "trust_status": "POSSIBLE_MATCH",
                "is_synthetic_demo": True,
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
                "parcel_number": "P-3201",
                "dag_no": "৩২০১",
                "khatian_no": "৭৮৯",
                "mouza": "Mirpur",
                "area_acres": 0.420,
                "trust_status": "VERIFICATION_REQUIRED",
                "is_synthetic_demo": True,
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

    return {
        "type": "FeatureCollection",
        "disclaimer_bn": "প্রদর্শিত সীমানা শুধুমাত্র উদাহরণের জন্য / এটি কোনো আইনি সীমানা বা রেকর্ড নয়",
        "disclaimer_en": "Illustrative / Not a legal boundary. Synthetic demo parcels.",
        "features": features,
    }
