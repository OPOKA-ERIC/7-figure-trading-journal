from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime, time
from typing import Optional, List


class UserResponse(BaseModel):
    id: UUID
    email: str
    display_name: str
    timezone: str
    plan: str
    email_verified: bool
    created_at: datetime

    model_config = {"from_attributes": True}


class UpdateProfileRequest(BaseModel):
    display_name: Optional[str] = None
    timezone: Optional[str] = None

    model_config = {"from_attributes": True}


class TradingRulesRequest(BaseModel):
    max_daily_trades: int = 5
    max_risk_percent: float = 2.0
    trading_session: str = "any"
    session_start_utc: Optional[time] = None
    session_end_utc: Optional[time] = None
    custom_mistakes: List[str] = []


class TradingRulesResponse(BaseModel):
    max_daily_trades: int
    max_risk_percent: float
    trading_session: str
    session_start_utc: Optional[time] = None
    session_end_utc: Optional[time] = None
    custom_mistakes: List[str] = []

    model_config = {"from_attributes": True}