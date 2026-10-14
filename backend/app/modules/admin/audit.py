import hashlib
import json
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import asc, desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import AuditLog
from app.modules.rbac.permissions import Permission, Scope, require

router = APIRouter(prefix="/admin/audit", tags=["Admin Audit Chain"])

GENESIS_HASH = "0" * 64


def canonical_json(data: Dict[str, Any]) -> str:
    """Produces deterministic canonical JSON serialization for cryptographic integrity."""
    return json.dumps(data, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def calculate_hash(prev_hash: str, payload_data: Dict[str, Any]) -> str:
    """Computes SHA-256 hash = sha256(prev_hash + payload)."""
    serialized = canonical_json(payload_data)
    combined = f"{prev_hash}{serialized}".encode("utf-8")
    return hashlib.sha256(combined).hexdigest()


async def write_audit_entry(
    db: AsyncSession,
    actor_id: Optional[uuid.UUID],
    actor_role: str,
    action: str,
    resource_type: str,
    resource_id: Optional[str],
    scope: str,
    payload: Dict[str, Any],
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None,
) -> AuditLog:
    """Appends an immutable hash-chained audit log record."""
    # Find latest record to retrieve prev_hash and next sequence_id
    stmt = select(AuditLog).order_by(desc(AuditLog.sequence_id)).limit(1)
    result = await db.execute(stmt)
    latest = result.scalar_one_or_none()

    next_sequence = (latest.sequence_id + 1) if (latest and latest.sequence_id is not None) else 1
    prev_hash = latest.current_hash if latest else GENESIS_HASH
    current_hash = calculate_hash(prev_hash, payload)

    log_entry = AuditLog(
        id=uuid.uuid4(),
        sequence_id=next_sequence,
        prev_hash=prev_hash,
        current_hash=current_hash,
        actor_id=actor_id,
        actor_role=actor_role,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        scope=scope,
        payload=payload,
        ip_address=ip_address,
        user_agent=user_agent,
        timestamp=datetime.now(timezone.utc),
    )
    db.add(log_entry)
    await db.commit()
    await db.refresh(log_entry)
    return log_entry


async def verify_chain_integrity(db: AsyncSession) -> Dict[str, Any]:
    """Scans all sequential audit records and verifies mathematical hash-chain continuity."""
    stmt = select(AuditLog).order_by(asc(AuditLog.sequence_id))
    result = await db.execute(stmt)
    records = list(result.scalars().all())

    if not records:
        return {
            "valid": True,
            "total_records": 0,
            "message": "Audit log is empty. Genesis state intact.",
            "tampered_at_sequence": None,
        }

    expected_prev = GENESIS_HASH

    for i, record in enumerate(records):
        # 1. Verify link to previous hash
        if record.prev_hash != expected_prev:
            return {
                "valid": False,
                "total_records": len(records),
                "tampered_at_sequence": record.sequence_id,
                "reason": f"Chain link broken at sequence {record.sequence_id}: prev_hash does not match predecessor.",
                "expected_prev": expected_prev,
                "actual_prev": record.prev_hash,
            }

        # 2. Verify integrity of current hash
        recalculated = calculate_hash(record.prev_hash, record.payload)
        if record.current_hash != recalculated:
            return {
                "valid": False,
                "total_records": len(records),
                "tampered_at_sequence": record.sequence_id,
                "reason": f"Payload tampering detected at sequence {record.sequence_id}: content was altered.",
                "stored_hash": record.current_hash,
                "recalculated_hash": recalculated,
            }

        expected_prev = record.current_hash

    return {
        "valid": True,
        "total_records": len(records),
        "latest_hash": records[-1].current_hash,
        "message": "Audit chain mathematically verified. Zero tampering detected.",
        "tampered_at_sequence": None,
    }


@router.get("", summary="Query audit logs")
async def list_audit_logs(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    action: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.AUDIT_VIEW, Scope.GLOBAL)),
):
    stmt = select(AuditLog)
    if action:
        stmt = stmt.where(AuditLog.action == action)
    stmt = stmt.order_by(desc(AuditLog.sequence_id)).offset(offset).limit(limit)
    result = await db.execute(stmt)
    logs = result.scalars().all()
    return {
        "total_returned": len(logs),
        "offset": offset,
        "limit": limit,
        "records": logs,
    }


@router.get("/verify-chain", summary="Cryptographically verify audit chain continuity")
async def verify_audit_chain_endpoint(
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.AUDIT_VERIFY, Scope.GLOBAL)),
):
    verification_result = await verify_chain_integrity(db)
    if not verification_result["valid"]:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=verification_result,
        )
    return verification_result
