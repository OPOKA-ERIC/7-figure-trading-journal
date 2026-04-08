from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
from decimal import Decimal
from typing import Optional, List


class TradeResponse(BaseModel):
    id: UUID
    account_id: UUID
    mt5_ticket: Optional[int]
    symbol: str
    direction: str
    open_time: datetime
    close_time: datetime
    open_price: Decimal
    close_price: Decimal
    lot_size: Decimal
    profit_loss: Decimal
    commission: Decimal
    swap: Decimal
    pips: Optional[Decimal]
    duration_seconds: Optional[int]
    created_at: datetime

    model_config = {"from_attributes": True}


class TradeWithPsychology(TradeResponse):
    emotion: Optional[str] = None
    followed_plan: Optional[str] = None
    mistake_type: Optional[str] = None
    notes: Optional[str] = None


class ImportSummary(BaseModel):
    imported: int
    skipped_duplicates: int
    errors: int
    total_rows: int


class TradeListResponse(BaseModel):
    trades: List[TradeResponse]
    total: int
    page: int
    limit: int
    pages: int