"""
Risk rules module export.
"""

from app.risk.rules.base import AlertEvidence, BaseRiskRule, ParcelContext, RuleAlert
from app.risk.rules.r1_conflicting_sale import ConflictingSaleRule
from app.risk.rules.r2_duplicate_deed import DuplicateDeedRule
from app.risk.rules.r3_impossible_dates import ImpossibleDatesRule
from app.risk.rules.r4_area_mismatch import AreaMismatchRule
from app.risk.rules.r5_deed_mutation import DeedMutationInconsistencyRule
from app.risk.rules.r6_party_name_mismatch import PartyNameMismatchRule

ALL_RULES = [
    ConflictingSaleRule(),
    DuplicateDeedRule(),
    ImpossibleDatesRule(),
    AreaMismatchRule(),
    DeedMutationInconsistencyRule(),
    PartyNameMismatchRule(),
]

__all__ = [
    "AlertEvidence",
    "BaseRiskRule",
    "ParcelContext",
    "RuleAlert",
    "ConflictingSaleRule",
    "DuplicateDeedRule",
    "ImpossibleDatesRule",
    "AreaMismatchRule",
    "DeedMutationInconsistencyRule",
    "PartyNameMismatchRule",
    "ALL_RULES",
]
