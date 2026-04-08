from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from typing import Optional


class CreateAccountRequest(BaseModel):
    account_name: str
    broker: Optional[str] = None
    account_number: Optional[str] = None
    currency: str = "USD"


class UpdateAccountRequest(BaseModel):
    account_name: Optional[str] = None
    broker: Optional[str] = None
    currency: Optional[str] = None


class AccountResponse(BaseModel):
    id: UUID
    user_id: UUID
    account_name: str
    broker: Optional[str]
    account_number: Optional[str]
    currency: str
    is_default: bool
    created_at: datetime

    model_config = {"from_attributes": True}