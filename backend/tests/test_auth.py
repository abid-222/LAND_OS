import uuid

import pyotp
import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.database import get_db
from app.core.security import verify_password
from app.main import app
from app.models import AuditLog, User


@pytest.fixture
async def test_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(User.__table__.create)
        await conn.run_sync(AuditLog.__table__.create)

    session_maker = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_maker() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def client(test_session: AsyncSession):
    async def override_get_db():
        yield test_session

    app.dependency_overrides[get_db] = override_get_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as ac:
        yield ac
    app.dependency_overrides.clear()


@pytest.mark.asyncio
async def test_register_and_login_flow(client: AsyncClient, test_session: AsyncSession):
    # 1. Register a new citizen
    reg_payload = {
        "email": "citizen1@landos.gov.bd",
        "password": "Password123#Secure",
        "phone": "01711000001",
        "full_name_bn": "আব্দুল করিম",
        "full_name_en": "Abdul Karim",
        "role": "Citizen",
    }
    reg_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert reg_res.status_code == 201, reg_res.text
    user_data = reg_res.json()
    assert user_data["email"] == "citizen1@landos.gov.bd"
    assert user_data["role"] == "Citizen"

    # Verify password was hashed with Argon2id
    from sqlalchemy import select

    user_in_db = (
        await test_session.execute(select(User).where(User.email == "citizen1@landos.gov.bd"))
    ).scalar_one()
    assert user_in_db.hashed_password.startswith("$argon2id$")
    assert verify_password("Password123#Secure", user_in_db.hashed_password) is True

    # 2. Duplicate registration rejected
    dup_res = await client.post("/api/v1/auth/register", json=reg_payload)
    assert dup_res.status_code == 400

    # 3. Successful login sets httpOnly cookies
    login_payload = {
        "email": "citizen1@landos.gov.bd",
        "password": "Password123#Secure",
    }
    login_res = await client.post("/api/v1/auth/login", json=login_payload)
    assert login_res.status_code == 200
    assert "landos_access_token" in login_res.cookies
    assert "landos_refresh_token" in login_res.cookies

    # 4. Token refresh rotation
    refresh_token = login_res.cookies["landos_refresh_token"]
    refresh_res = await client.post(
        "/api/v1/auth/refresh",
        cookies={"landos_refresh_token": refresh_token},
    )
    assert refresh_res.status_code == 200
    assert "landos_access_token" in refresh_res.cookies
    assert "landos_refresh_token" in refresh_res.cookies
    # Rotated token must be set
    assert refresh_res.cookies["landos_refresh_token"] != ""


@pytest.mark.asyncio
async def test_tech_admin_mfa_requirement(client: AsyncClient, test_session: AsyncSession):
    """Tech Admin role strictly requires TOTP MFA token during login."""
    from app.core.security import hash_password

    mfa_secret = pyotp.random_base32()
    tech_admin = User(
        id=uuid.uuid4(),
        email="techadmin@landos.gov.bd",
        hashed_password=hash_password("AdminSecurePass123!"),
        role="Tech Admin",
        mfa_secret=mfa_secret,
        mfa_enabled=True,
    )
    test_session.add(tech_admin)
    await test_session.commit()

    # 1. Login without TOTP code fails with 401
    fail_res = await client.post(
        "/api/v1/auth/login",
        json={"email": "techadmin@landos.gov.bd", "password": "AdminSecurePass123!"},
    )
    assert fail_res.status_code == 401
    assert "MFA token required" in fail_res.json()["detail"]

    # 2. Login with valid TOTP succeeds
    totp = pyotp.TOTP(mfa_secret)
    valid_code = totp.now()

    success_res = await client.post(
        "/api/v1/auth/login",
        json={
            "email": "techadmin@landos.gov.bd",
            "password": "AdminSecurePass123!",
            "totp_code": valid_code,
        },
    )
    assert success_res.status_code == 200
    assert "landos_access_token" in success_res.cookies
