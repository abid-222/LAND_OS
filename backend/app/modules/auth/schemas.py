import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, EmailStr, Field


class UserRegisterRequest(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    phone: Optional[str] = None
    full_name_bn: Optional[str] = None
    full_name_en: Optional[str] = None
    role: str = Field(default="Citizen")
    office_id: Optional[uuid.UUID] = None
    region_id: Optional[uuid.UUID] = None


class UserLoginRequest(BaseModel):
    email: EmailStr
    password: str
    totp_code: Optional[str] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: str
    phone: Optional[str] = None
    full_name_bn: Optional[str] = None
    full_name_en: Optional[str] = None
    role: str
    office_id: Optional[uuid.UUID] = None
    region_id: Optional[uuid.UUID] = None
    is_active: bool
    mfa_enabled: bool
    created_at: datetime

    class Config:
        from_attributes = True


class MFASetupResponse(BaseModel):
    secret: str
    otpauth_uri: str
    instructions: str


class MFAVerifyRequest(BaseModel):
    secret: Optional[str] = None
    code: str = Field(..., min_length=6, max_length=6)


class PasswordChangeRequest(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=8)


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirmRequest(BaseModel):
    email: EmailStr
    token: str
    new_password: str = Field(..., min_length=8)
