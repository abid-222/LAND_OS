import itertools

import pytest

from app.modules.rbac.permissions import (
    PERMISSION_MATRIX,
    Permission,
    Role,
    Scope,
    has_permission,
)

ALL_ROLES = list(Role)
ALL_PERMISSIONS = list(Permission)
ALL_ROLE_PERMISSION_PAIRS = list(itertools.product(ALL_ROLES, ALL_PERMISSIONS))


@pytest.mark.parametrize("role,permission", ALL_ROLE_PERMISSION_PAIRS)
def test_rbac_matrix_cell_evaluation(role: Role, permission: Permission):
    """
    Parametrized test checking EVERY role x permission cell (136 combinations).
    Enforces that:
    1. If the permission is defined for the role in the matrix, has_permission returns True.
    2. If the permission is NOT in the matrix for the role, has_permission strictly returns False (Deny-by-Default).
    """
    role_perms = PERMISSION_MATRIX.get(role, {})
    expected_allowed = permission in role_perms

    # Evaluate permission without scope constraint
    actual_allowed = has_permission(role, permission)
    assert actual_allowed is expected_allowed, (
        f"RBAC Cell Mismatch for role '{role.value}' and permission '{permission.value}'. "
        f"Expected {expected_allowed}, got {actual_allowed}."
    )


def test_scope_containment_hierarchy():
    """
    Verifies scope hierarchy:
    GLOBAL >= REGION >= OFFICE >= ASSIGNED >= OWN
    """
    # Operator has DOCUMENT_UPLOAD with Scope.OFFICE
    assert has_permission(Role.OPERATOR, Permission.DOCUMENT_UPLOAD, Scope.OWN) is True
    assert has_permission(Role.OPERATOR, Permission.DOCUMENT_UPLOAD, Scope.ASSIGNED) is True
    assert has_permission(Role.OPERATOR, Permission.DOCUMENT_UPLOAD, Scope.OFFICE) is True
    assert has_permission(Role.OPERATOR, Permission.DOCUMENT_UPLOAD, Scope.REGION) is False
    assert has_permission(Role.OPERATOR, Permission.DOCUMENT_UPLOAD, Scope.GLOBAL) is False

    # Citizen has DOCUMENT_UPLOAD with Scope.OWN
    assert has_permission(Role.CITIZEN, Permission.DOCUMENT_UPLOAD, Scope.OWN) is True
    assert has_permission(Role.CITIZEN, Permission.DOCUMENT_UPLOAD, Scope.OFFICE) is False
    assert has_permission(Role.CITIZEN, Permission.DOCUMENT_UPLOAD, Scope.GLOBAL) is False

    # Tech Admin has Scope.GLOBAL
    assert has_permission(Role.TECH_ADMIN, Permission.SYSTEM_CONFIGURE, Scope.GLOBAL) is True
    assert has_permission(Role.TECH_ADMIN, Permission.SYSTEM_CONFIGURE, Scope.OWN) is True


def test_deny_by_default_on_unknown():
    """Strictly denies any role or permission not explicitly recognized."""
    # Citizen must NOT have audit verification or system config
    assert has_permission(Role.CITIZEN, Permission.AUDIT_VERIFY) is False
    assert has_permission(Role.CITIZEN, Permission.SYSTEM_CONFIGURE) is False
    assert has_permission(Role.CITIZEN, Permission.USER_EDIT_ROLE) is False

    # Operator must NOT have user creation or system configure
    assert has_permission(Role.OPERATOR, Permission.SYSTEM_CONFIGURE) is False
    assert has_permission(Role.OPERATOR, Permission.USER_CREATE) is False

    # Tech Admin cannot make record decisions or edit records (1.9 requirement)
    assert has_permission(Role.TECH_ADMIN, Permission.CASE_REVIEW) is False
    assert has_permission(Role.TECH_ADMIN, Permission.CASE_APPROVE) is False
    assert has_permission(Role.TECH_ADMIN, Permission.RECORD_EDIT) is False
    assert has_permission(Role.TECH_ADMIN, Permission.NAMJARI_REVIEW) is False
    assert has_permission(Role.TECH_ADMIN, Permission.NAMJARI_APPROVE) is False

    # Namjari permissions per role
    assert has_permission(Role.CITIZEN, Permission.NAMJARI_APPLY) is True
    assert has_permission(Role.CITIZEN, Permission.NAMJARI_REVIEW) is False
    assert has_permission(Role.CITIZEN, Permission.NAMJARI_APPROVE) is False

    assert has_permission(Role.OPERATOR, Permission.NAMJARI_APPLY) is True
    assert has_permission(Role.OPERATOR, Permission.NAMJARI_REVIEW) is False
    assert has_permission(Role.OPERATOR, Permission.NAMJARI_APPROVE) is False

    assert has_permission(Role.REVIEWER, Permission.NAMJARI_REVIEW) is True
    assert has_permission(Role.REVIEWER, Permission.NAMJARI_APPROVE) is False

    assert has_permission(Role.SUPERVISOR, Permission.NAMJARI_REVIEW) is True
    assert has_permission(Role.SUPERVISOR, Permission.NAMJARI_APPROVE) is True

    # Security Officer cannot edit records or decide namjari
    assert has_permission(Role.SECURITY_OFFICER, Permission.RECORD_EDIT) is False
    assert has_permission(Role.SECURITY_OFFICER, Permission.NAMJARI_APPROVE) is False
