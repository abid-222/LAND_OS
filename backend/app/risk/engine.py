"""
Risk & Conflict Engine for Bangladesh LandOS.
Executes rules R1 to R6 in an idempotent, deduplicated manner.
Never overwrites or deletes reviewed or dismissed alert history.
"""

import json
import logging
import uuid
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Alert, Deed, LandRecord, Mutation, Parcel
from app.risk.rules import ALL_RULES, BaseRiskRule, ParcelContext, RuleAlert

logger = logging.getLogger("landos.risk.engine")


class RiskEngine:
    """
    Orchestrates risk & conflict rules on cadastral parcels.
    Ensures idempotency, evidence-based deduplication, and historical integrity.
    """

    def __init__(self, rules: Optional[List[BaseRiskRule]] = None):
        self.rules = rules or ALL_RULES

    async def build_context_from_db(self, parcel_id: str, db: AsyncSession) -> Optional[ParcelContext]:
        """Loads parcel and associated deeds, mutations, and records to build ParcelContext."""
        # 1. Load Parcel
        p_stmt = select(Parcel).where(Parcel.parcel_id == parcel_id)
        p_res = await db.execute(p_stmt)
        parcel = p_res.scalar_one_or_none()
        if not parcel:
            # Fallback for synthetic demo parcels
            from app.modules.map.router import _load_fallback_parcels

            features = _load_fallback_parcels()
            target_feat = None
            for f in features:
                fid = str(f.get("id") or "")
                props = f.get("properties", {})
                if parcel_id in (
                    fid,
                    str(props.get("synthetic_id")),
                    str(props.get("parcel_id")),
                    str(props.get("parcel_number")),
                    str(props.get("dag_no")),
                ):
                    target_feat = f
                    break

            if target_feat:
                props = target_feat.get("properties", {})
                return ParcelContext(
                    parcel_id=parcel_id,
                    mouza_id=str(props.get("mouza_id", "demo-mouza-1")),
                    mouza_name=str(props.get("mouza_bn", props.get("mouza", "তেজগাঁও"))),
                    main_no=int(props.get("main_no", 1205)),
                    sub_no=int(props.get("sub_no", 1)) if props.get("sub_no") else None,
                    area_decimal=float(props.get("area_decimal", 33.0)),
                    record={
                        "id": "REC-DEMO-1",
                        "khatian_no": str(props.get("khatian_no", "340")),
                        "dag_no": str(props.get("dag_no", "1205")),
                        "owner_names_bn": "আব্দুল করিম",
                        "land_class_bn": "নাল",
                        "area_acres": 0.33,
                    },
                    deeds=[],
                    mutations=[],
                    documents=[],
                    all_registry_deeds=[],
                )
            return None

        # 2. Load baseline LandRecord if linked
        rec_data = None
        if parcel.record_id:
            r_stmt = select(LandRecord).where(LandRecord.id == parcel.record_id)
            r_res = await db.execute(r_stmt)
            lr = r_res.scalar_one_or_none()
            if lr:
                rec_data = {
                    "id": str(lr.id),
                    "khatian_no": lr.khatian_no,
                    "dag_no": lr.dag_no,
                    "owner_names_bn": lr.owner_names_bn,
                    "area_acres": lr.area_acres,
                    "area_decimal": round((lr.area_acres or 0.0) * 100.0, 2),
                }

        # 3. Load Deeds on this parcel
        d_stmt = select(Deed).where(Deed.parcel_id == parcel_id).order_by(Deed.deed_date.asc())
        d_res = await db.execute(d_stmt)
        deeds = [
            {
                "id": str(d.id),
                "deed_no": d.deed_no,
                "deed_type": d.deed_type,
                "registry_office": d.registry_office,
                "deed_date": d.deed_date,
                "registered_date": d.registered_date,
                "seller": d.seller,
                "buyer": d.buyer,
                "area": d.area,
                "source_ref": d.source_ref,
                "parcel_id": parcel_id,
            }
            for d in d_res.scalars().all()
        ]

        # 4. Load Mutations on this parcel
        m_stmt = select(Mutation).where(Mutation.parcel_id == parcel_id).order_by(Mutation.mutation_date.asc())
        m_res = await db.execute(m_stmt)
        mutations = [
            {
                "id": str(m.id),
                "case_no": m.case_no,
                "mutation_date": m.mutation_date,
                "deed_id": str(m.deed_id) if m.deed_id else None,
                "from_party": m.from_party,
                "to_party": m.to_party,
                "area": m.area,
                "parcel_id": parcel_id,
            }
            for m in m_res.scalars().all()
        ]

        # 5. Global deeds for cross-parcel duplicate check
        global_deeds_stmt = select(Deed).limit(500)
        gd_res = await db.execute(global_deeds_stmt)
        all_registry_deeds = [
            {
                "id": str(d.id),
                "deed_no": d.deed_no,
                "registry_office": d.registry_office,
                "deed_date": d.deed_date,
                "registered_date": d.registered_date,
                "seller": d.seller,
                "buyer": d.buyer,
                "parcel_id": d.parcel_id,
            }
            for d in gd_res.scalars().all()
        ]

        mouza_name = parcel.mouza.name_bn if parcel.mouza else "অজ্ঞাত মৌজা"

        return ParcelContext(
            parcel_id=parcel_id,
            mouza_id=str(parcel.mouza_id),
            mouza_name=mouza_name,
            main_no=parcel.main_no,
            sub_no=parcel.sub_no,
            area_decimal=parcel.area_decimal,
            record=rec_data,
            deeds=deeds,
            mutations=mutations,
            documents=[],
            all_registry_deeds=all_registry_deeds,
        )

    async def run_all(
        self,
        parcel_id: str,
        db: Optional[AsyncSession] = None,
        ctx: Optional[ParcelContext] = None,
    ) -> List[RuleAlert]:
        """
        Runs all rules on parcel context, deduplicates by rule_id + evidence hash,
        persists new alerts without overwriting reviewed/dismissed history.
        """
        if ctx is None:
            if db is None:
                raise ValueError("Must provide either db or ctx to run_all.")
            loaded_ctx = await self.build_context_from_db(parcel_id, db)
            if not loaded_ctx:
                logger.warning(f"Parcel {parcel_id} not found.")
                return []
            ctx = loaded_ctx

        # Execute all rules
        raw_alerts: List[RuleAlert] = []
        for rule in self.rules:
            try:
                rule_res = rule.run(ctx)
                raw_alerts.extend(rule_res)
            except Exception as e:
                logger.error(f"Rule {rule.id} failed on parcel {parcel_id}: {e}")

        # In-memory deduplication by (rule_id, evidence_hash)
        deduped_alerts: Dict[str, RuleAlert] = {}
        for alert in raw_alerts:
            h = alert.evidence_hash()
            if h not in deduped_alerts:
                deduped_alerts[h] = alert

        final_alerts = list(deduped_alerts.values())

        # If DB provided, synchronize idempotently with alerts table
        if db:
            # Query existing alerts for this parcel
            stmt = select(Alert).where(Alert.parcel_id == parcel_id)
            res = await db.execute(stmt)
            existing_db_alerts = res.scalars().all()

            # Hash existing DB alerts: rule_id + evidence
            def db_alert_hash(a: Alert) -> str:
                import hashlib
                serialized = json.dumps(a.evidence or [], sort_keys=True, default=str)
                return hashlib.sha256(f"{a.rule_id}:{serialized}".encode("utf-8")).hexdigest()

            existing_map = {db_alert_hash(a): a for a in existing_db_alerts}

            for alert in final_alerts:
                h = alert.evidence_hash()
                if h in existing_map:
                    # Already exists: if status is reviewed or dismissed, NEVER change it!
                    continue
                else:
                    # New alert: insert
                    db_alert = Alert(
                        id=uuid.uuid4(),
                        parcel_id=parcel_id,
                        rule_id=alert.rule_id,
                        severity=alert.severity,
                        title_bn=alert.title_bn,
                        reason_bn=alert.reason_bn,
                        evidence=[e.model_dump() for e in alert.evidence],
                        status="open",
                        rule_version=alert.rule_version,
                    )
                    db.add(db_alert)

            await db.commit()

        return final_alerts
