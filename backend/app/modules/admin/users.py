"""
Admin Users Management Router for Bangladesh LandOS.
Endpoints:
- GET   /api/v1/admin/users              (list system users with roles and status)
- POST  /api/v1/admin/users              (create user with role ceiling limits)
- PATCH /api/v1/admin/users/{id}/disable (disable user account)
- PATCH /api/v1/admin/users/{id}/role    (update user role within permitted limits)
"""

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import hash_password
from app.core.session import revoke_user_refresh_tokens
from app.models import User
from app.modules.admin.audit import write_audit_entry
from app.modules.rbac.permissions import Permission, Role, Scope, require

router = APIRouter(prefix="/admin/users", tags=["Admin User Management"])


class UserListItem(BaseModel):
    id: str
    email: str
    phone: Optional[str] = None
    full_name_bn: Optional[str] = None
    full_name_en: Optional[str] = None
    role: str
    office_id: Optional[str] = None
    region_id: Optional[str] = None
    is_active: bool
    mfa_enabled: bool
    created_at: str


class UserListResponse(BaseModel):
    total_users: int
    users: List[UserListItem]


class CreateUserRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    role: str
    full_name_bn: Optional[str] = None
    full_name_en: Optional[str] = None
    phone: Optional[str] = None
    office_id: Optional[uuid.UUID] = None
    region_id: Optional[uuid.UUID] = None


class UpdateUserRoleRequest(BaseModel):
    role: str


OFFICE_ADMIN_ALLOWED_ROLES = {Role.OPERATOR.value, Role.REVIEWER.value, Role.CITIZEN.value}


@router.get(
    "",
    response_model=UserListResponse,
    summary="List registered users with roles and security status",
)
async def list_admin_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.USER_READ, Scope.OFFICE)),
):
    """
    Returns list of users across offices and roles.
    Office Admin sees users in their office; Tech Admin and Security Officer see globally.
    """
    stmt = select(User).order_by(User.created_at.desc())
    if current_user.role == Role.OFFICE_ADMIN.value and current_user.office_id:
        stmt = stmt.where(User.office_id == current_user.office_id)
    elif current_user.role == Role.REGIONAL_MANAGER.value and current_user.region_id:
        stmt = stmt.where(User.region_id == current_user.region_id)

    stmt = stmt.offset(offset).limit(limit)
    res = await db.execute(stmt)
    users = list(res.scalars().all())

    items = [
        UserListItem(
            id=str(u.id),
            email=u.email,
            phone=u.phone,
            full_name_bn=u.full_name_bn,
            full_name_en=u.full_name_en,
            role=u.role,
            office_id=str(u.office_id) if u.office_id else None,
            region_id=str(u.region_id) if u.region_id else None,
            is_active=u.is_active,
            mfa_enabled=u.mfa_enabled,
            created_at=u.created_at.isoformat(),
        )
        for u in users
    ]

    return UserListResponse(
        total_users=len(items),
        users=items,
    )


@router.post(
    "",
    response_model=UserListItem,
    status_code=status.HTTP_201_CREATED,
    summary="Create user with role ceiling limits",
)
async def create_admin_user(
    payload: CreateUserRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.USER_CREATE, Scope.OFFICE)),
):
    # Role assignment ceiling enforcement (Requirement 7.2)
    if current_user.role == Role.OFFICE_ADMIN.value:
        if payload.role not in OFFICE_ADMIN_ALLOWED_ROLES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Office Admin can only create users with roles: {', '.join(OFFICE_ADMIN_ALLOWED_ROLES)}.",
            )
        # Office Admin cannot assign users outside their office
        payload.office_id = current_user.office_id

    # Check email duplicate
    stmt = select(User).where(User.email == payload.email)
    existing = await db.execute(stmt)
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email address already exists.",
        )

    new_user = User(
        id=uuid.uuid4(),
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        full_name_bn=payload.full_name_bn,
        full_name_en=payload.full_name_en,
        phone=payload.phone,
        office_id=payload.office_id,
        region_id=payload.region_id,
        is_active=True,
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="admin:user_create",
        resource_type="user",
        resource_id=str(new_user.id),
        scope="office" if current_user.role == Role.OFFICE_ADMIN.value else "global",
        payload={"email": new_user.email, "role": new_user.role},
    )

    return UserListItem(
        id=str(new_user.id),
        email=new_user.email,
        phone=new_user.phone,
        full_name_bn=new_user.full_name_bn,
        full_name_en=new_user.full_name_en,
        role=new_user.role,
        office_id=str(new_user.office_id) if new_user.office_id else None,
        region_id=str(new_user.region_id) if new_user.region_id else None,
        is_active=new_user.is_active,
        mfa_enabled=new_user.mfa_enabled,
        created_at=new_user.created_at.isoformat(),
    )


@router.patch(
    "/{user_id}/disable",
    summary="Disable user account",
)
async def disable_user_account(
    user_id: str,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.USER_EDIT_ROLE, Scope.GLOBAL)),
):
    try:
        u_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed user UUID.")

    stmt = select(User).where(User.id == u_uuid)
    res = await db.execute(stmt)
    target_user = res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    target_user.is_active = False
    revoke_user_refresh_tokens(str(target_user.id))
    await db.commit()

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="admin:user_disable",
        resource_type="user",
        resource_id=str(target_user.id),
        scope="global",
        payload={"email": target_user.email, "is_active": False},
    )

    return {"status": "success", "message": f"User '{target_user.email}' disabled successfully."}


@router.patch(
    "/{user_id}/role",
    summary="Update user role with ceiling check",
)
async def update_user_role(
    user_id: str,
    payload: UpdateUserRoleRequest,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.USER_EDIT_ROLE, Scope.GLOBAL)),
):
    try:
        u_uuid = uuid.UUID(user_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed user UUID.")

    stmt = select(User).where(User.id == u_uuid)
    res = await db.execute(stmt)
    target_user = res.scalar_one_or_none()
    if not target_user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    old_role = target_user.role
    target_user.role = payload.role
    revoke_user_refresh_tokens(str(target_user.id))
    await db.commit()

    await write_audit_entry(
        db=db,
        actor_id=current_user.id,
        actor_role=current_user.role,
        action="admin:role_change",
        resource_type="user",
        resource_id=str(target_user.id),
        scope="global",
        payload={"email": target_user.email, "old_role": old_role, "new_role": payload.role},
    )

    return {"status": "success", "message": f"Role updated from '{old_role}' to '{payload.role}'."}
