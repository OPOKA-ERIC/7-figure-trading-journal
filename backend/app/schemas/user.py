from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime
from typing import Optional


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