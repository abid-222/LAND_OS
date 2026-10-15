"""
Admin Users Management Router for Bangladesh LandOS.
Endpoint:
- GET /api/v1/admin/users (list system users with roles and status)
"""

from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import User
from app.modules.rbac.permissions import Permission, Scope, require

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


@router.get(
    "",
    response_model=UserListResponse,
    summary="List registered users with roles and security status",
)
async def list_admin_users(
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(require(Permission.USER_READ, Scope.GLOBAL)),
):
    """
    Returns list of users across offices and roles.
    Requires elevated USER_READ permission with GLOBAL scope (Tech Admin / Security Officer).
    """
    stmt = select(User).order_by(User.created_at.desc()).offset(offset).limit(limit)
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
