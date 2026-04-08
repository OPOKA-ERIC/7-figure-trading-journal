from pydantic import BaseModel, field_validator
from uuid import UUID
from datetime import datetime
from typing import Optional

VALID_EMOTIONS = {"calm", "confident", "anxious", "frustrated", "fearful", "greedy", "neutral"}
VALID_PLAN = {"yes", "no", "partially"}
VALID_MISTAKES = {
    "early_entry", "late_entry", "moved_stop_loss", "removed_take_profit",
    "over_risked", "fomo_entry", "revenge_trade", "overtraded",
    "ignored_session_rules", "no_reason"
}


class PsychologyLogRequest(BaseModel):
    emotion: Optional[str] = None
    followed_plan: Optional[str] = None
    mistake_type: Optional[str] = None
    notes: Optional[str] = None

    @field_validator("emotion")
    @classmethod
    def validate_emotion(cls, v):
        if v and v not in VALID_EMOTIONS:
            raise ValueError(f"emotion must be one of {VALID_EMOTIONS}")
        return v

    @field_validator("followed_plan")
    @classmethod
    def validate_plan(cls, v):
        if v and v not in VALID_PLAN:
            raise ValueError(f"followed_plan must be one of {VALID_PLAN}")
        return v

    @field_validator("mistake_type")
    @classmethod
    def validate_mistake(cls, v):
        if v and v not in VALID_MISTAKES:
            raise ValueError(f"mistake_type must be one of {VALID_MISTAKES}")
        return v

    @field_validator("notes")
    @classmethod
    def validate_notes(cls, v):
        if v and len(v) > 500:
            raise ValueError("Notes cannot exceed 500 characters")
        return v


class PsychologyLogResponse(BaseModel):
    id: UUID
    trade_id: UUID
    emotion: Optional[str]
    followed_plan: Optional[str]
    mistake_type: Optional[str]
    notes: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}