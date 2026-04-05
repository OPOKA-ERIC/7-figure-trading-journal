import uuid
from datetime import datetime, time
from sqlalchemy import String, Integer, Numeric, Time, DateTime, ForeignKey, func
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class UserTradingRules(Base):
    __tablename__ = "user_trading_rules"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), unique=True, nullable=False)
    max_daily_trades: Mapped[int] = mapped_column(Integer, default=5)
    max_risk_percent: Mapped[float] = mapped_column(Numeric(5, 2), default=2.0)
    trading_session: Mapped[str] = mapped_column(String(20), default="any")
    session_start_utc: Mapped[time | None] = mapped_column(Time, nullable=True)
    session_end_utc: Mapped[time | None] = mapped_column(Time, nullable=True)
    custom_mistakes: Mapped[list] = mapped_column(JSONB, default=list)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())