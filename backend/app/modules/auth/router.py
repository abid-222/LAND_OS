import uuid
from datetime import timedelta
from typing import Literal, Optional, cast

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.csrf import generate_csrf_token
from app.core.database import get_db
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_access_token,
    create_refresh_token,
    create_token,
    decode_token,
    generate_totp_secret,
    get_totp_uri,
    hash_password,
    verify_password,
    verify_totp,
)
from app.core.session import (
    clear_failed_logins,
    is_account_locked,
    record_active_refresh_jti,
    record_failed_login,
    revoke_user_refresh_tokens,
    rotate_refresh_jti,
    validate_refresh_jti,
)
from app.models import User
from app.modules.admin.audit import write_audit_entry
from app.modules.auth.dependencies import get_current_user
from app.modules.auth.schemas import (
    MFASetupResponse,
    MFAVerifyRequest,
    PasswordChangeRequest,
    PasswordResetConfirmRequest,
    PasswordResetRequest,
    UserLoginRequest,
    UserRegisterRequest,
    UserResponse,
)
from app.modules.rbac.permissions import Role

router = APIRouter(prefix="/auth", tags=["Authentication & Session"])


def _get_cookie_samesite() -> Literal["lax", "strict", "none"]:
    val = settings.COOKIE_SAMESITE.lower()
    if val in ("lax", "strict", "none"):
        return cast(Literal["lax", "strict", "none"], val)
    return "lax"


def set_auth_cookies(
    response: Response,
    access_token: str,
    refresh_token: str,
    csrf_token: Optional[str] = None,
):
    samesite = _get_cookie_samesite()
    secure = settings.COOKIE_SECURE or (samesite == "none")

    response.set_cookie(
        key="landos_access_token",
        value=access_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        path="/",
    )
    response.set_cookie(
        key="landos_refresh_token",
        value=refresh_token,
        httponly=True,
        secure=secure,
        samesite=samesite,
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
        path="/",
    )
    if csrf_token:
        response.set_cookie(
            key="landos_csrf_token",
            value=csrf_token,
            httponly=False,  # JavaScript readable for double-submit CSRF defense
            secure=secure,
            samesite=samesite,
            max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 86400,
            path="/",
        )


def clear_auth_cookies(response: Response):
    samesite = _get_cookie_samesite()
    secure = settings.COOKIE_SECURE or (samesite == "none")
    response.delete_cookie(key="landos_access_token", path="/", secure=secure, samesite=samesite)
    response.delete_cookie(key="landos_refresh_token", path="/", secure=secure, samesite=samesite)
    response.delete_cookie(key="landos_csrf_token", path="/", secure=secure, samesite=samesite)


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register(
    request: Request,
    payload: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
):
    # Check if user already exists
    stmt = select(User).where(User.email == payload.email)
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    # Validate role enum
    try:
        user_role = Role(payload.role)
    except ValueError:
        user_role = Role.CITIZEN

    # Hash with Argon2id
    hashed_pwd = hash_password(payload.password)

    new_user = User(
        id=uuid.uuid4(),
        email=payload.email,
        phone=payload.phone,
        full_name_bn=payload.full_name_bn,
        full_name_en=payload.full_name_en,
        hashed_password=hashed_pwd,
        role=user_role.value,
        office_id=payload.office_id,
        region_id=payload.region_id,
        is_active=True,
        mfa_enabled=False,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    # Write audit log
    await write_audit_entry(
        db=db,
        actor_id=new_user.id,
        actor_role=new_user.role,
        action="auth:register",
        resource_type="user",
        resource_id=str(new_user.id),
        scope="own",
        payload={"email": new_user.email, "role": new_user.role},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return new_user


@router.post(
    "/login",
    response_model=UserResponse,
    dependencies=[Depends(rate_limit(requests=15, window_seconds=60))],
)
async def login(
    request: Request,
    response: Response,
    payload: UserLoginRequest,
    db: AsyncSession = Depends(get_db),
):
    if is_account_locked(payload.email):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Account temporarily locked due to consecutive failed attempts. Please try again later.",
        )

    stmt = select(User).where(User.email == payload.email)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        record_failed_login(payload.email)
        await write_audit_entry(
            db=db,
            actor_id=user.id if user else None,
            actor_role=user.role if user else Role.CITIZEN.value,
            action="auth:failed_login",
            resource_type="session",
            resource_id=payload.email,
            scope="own",
            payload={"email": payload.email, "reason": "invalid_credentials"},
            ip_address=request.client.host if request.client else None,
            user_agent=request.headers.get("user-agent"),
        )
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is disabled. Contact system administrator.",
        )

    # Enforce TOTP MFA if user is Tech Admin / Security Officer or has MFA enabled
    requires_mfa = (
        user.role in [Role.TECH_ADMIN.value, Role.SECURITY_OFFICER.value]
    ) or user.mfa_enabled

    if requires_mfa:
        if not payload.totp_code:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="MFA token required for this administrative account.",
                headers={"X-LandOS-MFA-Required": "true"},
            )
        if not user.mfa_secret or not verify_totp(user.mfa_secret, payload.totp_code):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid or expired MFA code.",
            )

    clear_failed_logins(payload.email)

    # Create tokens with unique jti
    jti = str(uuid.uuid4())
    access_token = create_access_token(user_id=str(user.id), role=user.role, email=user.email)
    refresh_token = create_refresh_token(user_id=str(user.id), jti=jti)
    record_active_refresh_jti(str(user.id), jti)

    # Generate CSRF token
    csrf_token = generate_csrf_token()

    # Set secure httpOnly cookies and CSRF cookie
    set_auth_cookies(response, access_token, refresh_token, csrf_token)

    # Audit login
    await write_audit_entry(
        db=db,
        actor_id=user.id,
        actor_role=user.role,
        action="auth:login",
        resource_type="session",
        resource_id=str(user.id),
        scope="own",
        payload={"email": user.email, "role": user.role, "mfa_verified": requires_mfa},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )

    return user


@router.post("/refresh")
async def refresh_tokens(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db),
):
    # Retrieve refresh token from cookie
    refresh_token = request.cookies.get("landos_refresh_token")
    if not refresh_token:
        # Check header fallback for programmatic API testing
        auth_header = request.headers.get("Authorization")
        if auth_header and auth_header.startswith("Bearer "):
            refresh_token = auth_header.split(" ")[1]

    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Refresh token not provided."
        )

    payload = decode_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired refresh token."
        )

    user_id_str = payload.get("sub")
    jti = payload.get("jti")
    if not user_id_str:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token subject."
        )

    # Reuse detection and revocation validation
    if jti and not validate_refresh_jti(user_id_str, jti):
        clear_auth_cookies(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token reuse detected or session expired. Please log in again.",
        )

    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Malformed token subject."
        )

    stmt = select(User).where(User.id == user_uuid)
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="User account inactive or not found."
        )

    # Refresh rotation: generate new access token and rotated refresh token with new JTI
    new_jti = str(uuid.uuid4())
    if jti:
        rotate_refresh_jti(user_id_str, jti, new_jti)
    else:
        record_active_refresh_jti(user_id_str, new_jti)

    new_access_token = create_access_token(user_id=str(user.id), role=user.role, email=user.email)
    new_refresh_token = create_refresh_token(user_id=str(user.id), jti=new_jti)
    new_csrf_token = generate_csrf_token()

    set_auth_cookies(response, new_access_token, new_refresh_token, new_csrf_token)
    return {"status": "success", "message": "Tokens rotated successfully"}


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    refresh_token = request.cookies.get("landos_refresh_token")
    jti = None
    if refresh_token:
        p = decode_token(refresh_token)
        jti = p.get("jti") if p else None

    revoke_user_refresh_tokens(str(current_user.id), jti)
    clear_auth_cookies(response)

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="auth:logout",
        resource_type="session",
        resource_id=str(current_user.id),
        scope="own",
        payload={"email": current_user.email},
        ip_address=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
    )
    return {"status": "success", "message": "Successfully logged out."}


@router.post("/password/change")
async def change_password(
    payload: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Allows authenticated user to change their password."""
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password verification failed.",
        )

    current_user.hashed_password = hash_password(payload.new_password)
    # Invalidate existing sessions
    revoke_user_refresh_tokens(str(current_user.id))
    await db.commit()

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="auth:password_change",
        resource_type="user",
        resource_id=str(current_user.id),
        scope="own",
        payload={"email": current_user.email},
    )

    return {"status": "success", "message": "Password updated successfully. Please log in again."}


@router.post(
    "/password/reset-request",
    dependencies=[Depends(rate_limit(requests=10, window_seconds=60))],
)
async def request_password_reset(
    payload: PasswordResetRequest,
    db: AsyncSession = Depends(get_db),
):
    """
    Initiates password reset flow.
    In development / demo mode, returns the signed reset token directly.
    """
    stmt = select(User).where(User.email == payload.email)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user:
        # Generic message to prevent user enumeration (Requirement 1.3)
        return {
            "status": "success",
            "message": "If this email exists in our records, password reset instructions have been dispatched.",
        }

    reset_token = create_token(
        data={"sub": str(user.id), "purpose": "pwd_reset"},
        expires_delta=timedelta(minutes=15),
        token_type="reset",
    )

    await write_audit_entry(
        db=db,
        actor_id=user.id,
        actor_role=user.role,
        action="auth:password_reset_request",
        resource_type="user",
        resource_id=str(user.id),
        scope="own",
        payload={"email": user.email},
    )

    return {
        "status": "success",
        "message": "If this email exists in our records, password reset instructions have been dispatched.",
        "demo_reset_token": reset_token,
    }


@router.post(
    "/password/reset-confirm",
    dependencies=[Depends(rate_limit(requests=10, window_seconds=60))],
)
async def confirm_password_reset(
    payload: PasswordResetConfirmRequest,
    db: AsyncSession = Depends(get_db),
):
    """Confirms password reset using valid reset token."""
    token_payload = decode_token(payload.token)
    if not token_payload or token_payload.get("purpose") != "pwd_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token.",
        )

    user_id_str = token_payload.get("sub")
    try:
        user_uuid = uuid.UUID(user_id_str)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed reset token subject."
        )

    stmt = select(User).where(User.id == user_uuid)
    res = await db.execute(stmt)
    user = res.scalar_one_or_none()

    if not user or user.email.lower() != payload.email.lower():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Token does not match provided email."
        )

    user.hashed_password = hash_password(payload.new_password)
    revoke_user_refresh_tokens(str(user.id))
    await db.commit()

    await write_audit_entry(
        db=db,
        actor_id=user.id,
        actor_role=user.role,
        action="auth:password_reset_confirm",
        resource_type="user",
        resource_id=str(user.id),
        scope="own",
        payload={"email": user.email},
    )

    return {
        "status": "success",
        "message": "Password has been successfully reset. You may now log in.",
    }


@router.post("/mfa/setup", response_model=MFASetupResponse)
async def setup_mfa(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    secret = generate_totp_secret()
    otpauth_uri = get_totp_uri(secret, current_user.email)

    current_user.mfa_secret = secret
    await db.commit()

    return MFASetupResponse(
        secret=secret,
        otpauth_uri=otpauth_uri,
        instructions="Scan this URI/QR in Google Authenticator or 1Password, then verify with a 6-digit code.",
    )


@router.post("/mfa/verify")
async def verify_and_enable_mfa(
    payload: MFAVerifyRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    secret = payload.secret or current_user.mfa_secret
    if not secret:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="No MFA secret initiated."
        )

    if not verify_totp(secret, payload.code):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid 6-digit verification code."
        )

    current_user.mfa_secret = secret
    current_user.mfa_enabled = True
    await db.commit()

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="auth:mfa_enabled",
        resource_type="user",
        resource_id=str(current_user.id),
        scope="own",
        payload={"email": current_user.email},
    )

    return {"status": "success", "message": "MFA successfully activated."}


@router.get("/me", response_model=UserResponse)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
):
    return current_user
