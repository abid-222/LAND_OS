from enum import Enum
from typing import Callable, Dict, Optional

from fastapi import Depends, HTTPException, status


class Role(str, Enum):
    CITIZEN = "Citizen"
    OPERATOR = "Operator"
    REVIEWER = "Reviewer"
    SUPERVISOR = "Supervisor"
    OFFICE_ADMIN = "Office Admin"
    REGIONAL_MANAGER = "Regional Manager"
    SECURITY_OFFICER = "Security Officer"
    TECH_ADMIN = "Tech Admin"


class Scope(str, Enum):
    OWN = "own"
    ASSIGNED = "assigned"
    OFFICE = "office"
    REGION = "region"
    GLOBAL = "global"


SCOPE_LEVELS: Dict[Scope, int] = {
    Scope.OWN: 1,
    Scope.ASSIGNED: 2,
    Scope.OFFICE: 3,
    Scope.REGION: 4,
    Scope.GLOBAL: 5,
}


class Permission(str, Enum):
    DOCUMENT_UPLOAD = "document:upload"
    DOCUMENT_READ = "document:read"
    DOCUMENT_DELETE = "document:delete"
    RECORD_SEARCH = "record:search"
    RECORD_VIEW_SENSITIVE = "record:view_sensitive"
    RECORD_EDIT = "record:edit"
    CASE_CREATE = "case:create"
    CASE_VIEW = "case:view"
    CASE_ASSIGN = "case:assign"
    CASE_REVIEW = "case:review"
    CASE_APPROVE = "case:approve"
    USER_READ = "user:read"
    USER_CREATE = "user:create"
    USER_EDIT_ROLE = "user:edit_role"
    AUDIT_VIEW = "audit:view"
    AUDIT_VERIFY = "audit:verify"
    SYSTEM_CONFIGURE = "system:configure"


# Explicit Deny-By-Default Permission Matrix
# Any (Role, Permission) pair omitted evaluates strictly to DENIED.
PERMISSION_MATRIX: Dict[Role, Dict[Permission, Scope]] = {
    Role.CITIZEN: {
        Permission.DOCUMENT_UPLOAD: Scope.OWN,
        Permission.DOCUMENT_READ: Scope.OWN,
        Permission.DOCUMENT_DELETE: Scope.OWN,
        Permission.RECORD_SEARCH: Scope.GLOBAL,
        Permission.CASE_CREATE: Scope.OWN,
        Permission.CASE_VIEW: Scope.OWN,
    },
    Role.OPERATOR: {
        Permission.DOCUMENT_UPLOAD: Scope.OFFICE,
        Permission.DOCUMENT_READ: Scope.OFFICE,
        Permission.RECORD_SEARCH: Scope.OFFICE,
        Permission.RECORD_VIEW_SENSITIVE: Scope.OFFICE,
        Permission.CASE_CREATE: Scope.OFFICE,
        Permission.CASE_VIEW: Scope.OFFICE,
    },
    Role.REVIEWER: {
        Permission.DOCUMENT_READ: Scope.OFFICE,
        Permission.RECORD_SEARCH: Scope.OFFICE,
        Permission.RECORD_VIEW_SENSITIVE: Scope.OFFICE,
        Permission.RECORD_EDIT: Scope.ASSIGNED,
        Permission.CASE_VIEW: Scope.OFFICE,
        Permission.CASE_REVIEW: Scope.ASSIGNED,
    },
    Role.SUPERVISOR: {
        Permission.DOCUMENT_READ: Scope.OFFICE,
        Permission.RECORD_SEARCH: Scope.OFFICE,
        Permission.RECORD_VIEW_SENSITIVE: Scope.OFFICE,
        Permission.RECORD_EDIT: Scope.OFFICE,
        Permission.CASE_VIEW: Scope.OFFICE,
        Permission.CASE_ASSIGN: Scope.OFFICE,
        Permission.CASE_REVIEW: Scope.OFFICE,
        Permission.CASE_APPROVE: Scope.OFFICE,
    },
    Role.OFFICE_ADMIN: {
        Permission.DOCUMENT_READ: Scope.OFFICE,
        Permission.RECORD_SEARCH: Scope.OFFICE,
        Permission.CASE_VIEW: Scope.OFFICE,
        Permission.CASE_ASSIGN: Scope.OFFICE,
        Permission.USER_READ: Scope.OFFICE,
        Permission.USER_CREATE: Scope.OFFICE,
    },
    Role.REGIONAL_MANAGER: {
        Permission.DOCUMENT_READ: Scope.REGION,
        Permission.RECORD_SEARCH: Scope.REGION,
        Permission.RECORD_VIEW_SENSITIVE: Scope.REGION,
        Permission.CASE_VIEW: Scope.REGION,
        Permission.CASE_REVIEW: Scope.REGION,
        Permission.CASE_APPROVE: Scope.REGION,
        Permission.USER_READ: Scope.REGION,
    },
    Role.SECURITY_OFFICER: {
        Permission.RECORD_VIEW_SENSITIVE: Scope.GLOBAL,
        Permission.USER_READ: Scope.GLOBAL,
        Permission.AUDIT_VIEW: Scope.GLOBAL,
        Permission.AUDIT_VERIFY: Scope.GLOBAL,
    },
    Role.TECH_ADMIN: {
        Permission.DOCUMENT_UPLOAD: Scope.GLOBAL,
        Permission.DOCUMENT_READ: Scope.GLOBAL,
        Permission.DOCUMENT_DELETE: Scope.GLOBAL,
        Permission.RECORD_SEARCH: Scope.GLOBAL,
        Permission.RECORD_VIEW_SENSITIVE: Scope.GLOBAL,
        Permission.CASE_CREATE: Scope.GLOBAL,
        Permission.CASE_VIEW: Scope.GLOBAL,
        Permission.CASE_ASSIGN: Scope.GLOBAL,
        Permission.USER_READ: Scope.GLOBAL,
        Permission.USER_CREATE: Scope.GLOBAL,
        Permission.USER_EDIT_ROLE: Scope.GLOBAL,
        Permission.AUDIT_VIEW: Scope.GLOBAL,
        Permission.AUDIT_VERIFY: Scope.GLOBAL,
        Permission.SYSTEM_CONFIGURE: Scope.GLOBAL,
    },
}


def has_permission(
    role: Role, permission: Permission, required_scope: Optional[Scope] = None
) -> bool:
    """Evaluates whether role possesses permission, enforcing hierarchy on required_scope."""
    role_perms = PERMISSION_MATRIX.get(role)
    if not role_perms:
        return False
    granted_scope = role_perms.get(permission)
    if not granted_scope:
        return False
    if required_scope is None:
        return True
    return SCOPE_LEVELS[granted_scope] >= SCOPE_LEVELS[required_scope]


def require(permission: Permission, scope: Optional[Scope] = None) -> Callable:
    """FastAPI Dependency for server-side deny-by-default RBAC checks."""
    from app.modules.auth.dependencies import get_current_user

    async def dependency(current_user=Depends(get_current_user)):
        user_role = Role(current_user.role)
        if not has_permission(user_role, permission, scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value} with scope '{scope.value if scope else 'any'}' requires elevated privileges.",
            )
        return current_user

    return dependency


def require_public_or_role(permission: Permission, scope: Optional[Scope] = None) -> Callable:
    """FastAPI Dependency allowing public citizen access, or enforcing permissions for logged-in users."""
    from app.modules.auth.dependencies import get_optional_current_user

    async def dependency(current_user=Depends(get_optional_current_user)):
        user_role = Role(current_user.role) if current_user else Role.CITIZEN
        if not has_permission(user_role, permission, scope):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Permission denied: {permission.value} with scope '{scope.value if scope else 'any'}' requires elevated privileges.",
            )
        return current_user

    return dependency

