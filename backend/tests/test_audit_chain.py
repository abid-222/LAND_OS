import uuid
from typing import cast

import pytest
from sqlalchemy import Table
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import Base
from app.models import AuditLog
from app.modules.admin.audit import (
    GENESIS_HASH,
    calculate_hash,
    verify_chain_integrity,
    write_audit_entry,
)


@pytest.fixture
async def test_db():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all, tables=[cast(Table, AuditLog.__table__)])

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_audit_chain_genesis_and_continuation(test_db: AsyncSession):
    # 1. Initially empty chain
    res = await verify_chain_integrity(test_db)
    assert res["valid"] is True
    assert res["total_records"] == 0

    # 2. First block (Genesis predecessor)
    actor_id = uuid.uuid4()
    entry1 = await write_audit_entry(
        db=test_db,
        actor_id=actor_id,
        actor_role="Citizen",
        action="auth:login",
        resource_type="session",
        resource_id=str(actor_id),
        scope="own",
        payload={"ip": "127.0.0.1", "action": "login"},
    )
    assert entry1.sequence_id == 1
    assert entry1.prev_hash == GENESIS_HASH
    assert entry1.current_hash == calculate_hash(
        GENESIS_HASH, {"ip": "127.0.0.1", "action": "login"}
    )

    # 3. Second block
    entry2 = await write_audit_entry(
        db=test_db,
        actor_id=actor_id,
        actor_role="Citizen",
        action="record:search",
        resource_type="khatian",
        resource_id="1205",
        scope="own",
        payload={"query": "১২০৫"},
    )
    assert entry2.sequence_id == 2
    assert entry2.prev_hash == entry1.current_hash

    # 4. Third block
    entry3 = await write_audit_entry(
        db=test_db,
        actor_id=actor_id,
        actor_role="Tech Admin",
        action="system:configure",
        resource_type="settings",
        resource_id=None,
        scope="global",
        payload={"feature_flag": "pwa_enabled"},
    )
    assert entry3.sequence_id == 3
    assert entry3.prev_hash == entry2.current_hash

    # 5. Verify whole valid chain
    verification = await verify_chain_integrity(test_db)
    assert verification["valid"] is True
    assert verification["total_records"] == 3
    assert verification["tampered_at_sequence"] is None


@pytest.mark.asyncio
async def test_audit_chain_detects_payload_tampering(test_db: AsyncSession):
    actor_id = uuid.uuid4()

    # Create 3 blocks
    for i in range(1, 4):
        await write_audit_entry(
            db=test_db,
            actor_id=actor_id,
            actor_role="Citizen",
            action=f"action_{i}",
            resource_type="doc",
            resource_id=str(i),
            scope="own",
            payload={"step": i},
        )

    # Confirm chain starts valid
    res_before = await verify_chain_integrity(test_db)
    assert res_before["valid"] is True

    # Tamper with block 2 payload
    from sqlalchemy import select

    stmt = select(AuditLog).where(AuditLog.sequence_id == 2)
    entry2 = (await test_db.execute(stmt)).scalar_one()
    entry2.payload = {"step": 999, "tampered": True}
    await test_db.commit()

    # Verification must catch the tampering at sequence 2
    res_after = await verify_chain_integrity(test_db)
    assert res_after["valid"] is False
    assert res_after["tampered_at_sequence"] == 2
    assert "Payload tampering detected" in res_after["reason"]
