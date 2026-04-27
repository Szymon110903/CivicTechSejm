"""Enum definitions for database models"""

import enum


class VotingDecision(str, enum.Enum):
    """
    Club voting decision - dominant vote in the club
    
    YES - Majority voted YES
    NO - Majority voted NO
    ABSTAIN - Majority abstained
    MIXED - Club was split (no clear majority)
    """
    YES = "YES"
    NO = "NO"
    ABSTAIN = "ABSTAIN"
    MIXED = "MIXED"
