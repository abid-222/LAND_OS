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
from app.risk.rules.r7_khas_government_land import KhasOrGovernmentLandRule
from app.risk.rules.r8_active_litigation import ActiveLitigationRule
from app.risk.rules.r9_acquisition_notice import AcquisitionNoticeRule

ALL_RULES = [
    ConflictingSaleRule(),
    DuplicateDeedRule(),
    ImpossibleDatesRule(),
    AreaMismatchRule(),
    DeedMutationInconsistencyRule(),
    PartyNameMismatchRule(),
    KhasOrGovernmentLandRule(),
    ActiveLitigationRule(),
    AcquisitionNoticeRule(),
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
    "KhasOrGovernmentLandRule",
    "ActiveLitigationRule",
    "AcquisitionNoticeRule",
    "ALL_RULES",
]
