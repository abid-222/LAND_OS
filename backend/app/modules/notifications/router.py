import uuid
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models import Notification, User
from app.modules.auth.dependencies import get_current_user

router = APIRouter(prefix="/notifications", tags=["In-App Notifications"])


class NotificationItem(BaseModel):
    id: str
    type: str
    title: str
    message: str
    is_read: bool
    data: Optional[Dict[str, Any]] = None
    created_at: str


class NotificationListResponse(BaseModel):
    total_unread: int
    notifications: List[NotificationItem]


@router.get("", response_model=NotificationListResponse, summary="List notifications for current user")
async def list_notifications(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    stmt = (
        select(Notification)
        .where(Notification.user_id == current_user.id)
        .order_by(desc(Notification.created_at))
        .limit(50)
    )
    res = await db.execute(stmt)
    records = list(res.scalars().all())

    items = [
        NotificationItem(
            id=str(n.id),
            type=n.type,
            title=n.title,
            message=n.message,
            is_read=n.is_read,
            data=n.data,
            created_at=n.created_at.isoformat(),
        )
        for n in records
    ]

    unread_count = sum(1 for n in records if not n.is_read)

    return NotificationListResponse(
        total_unread=unread_count,
        notifications=items,
    )


@router.patch("/{notification_id}/read", summary="Mark notification as read")
async def mark_notification_read(
    notification_id: str,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        n_uuid = uuid.UUID(notification_id)
    except ValueError:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Malformed notification UUID.")

    stmt = select(Notification).where(Notification.id == n_uuid, Notification.user_id == current_user.id)
    res = await db.execute(stmt)
    notif = res.scalar_one_or_none()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    await db.commit()

    return {"status": "success", "message": "Notification marked as read."}
