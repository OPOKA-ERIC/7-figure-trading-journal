import uuid
from datetime import datetime
from decimal import Decimal
from sqlalchemy import String, DateTime, ForeignKey, Numeric, BigInteger, Integer, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.db.base import Base

class Trade(Base):
    __tablename__ = "trades"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    account_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("trading_accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    mt5_ticket: Mapped[int | None] = mapped_column(BigInteger, nullable=True, index=True)
    symbol: Mapped[str] = mapped_column(String(20), nullable=False, index=True)
    direction: Mapped[str] = mapped_column(String(4), nullable=False)
    open_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    close_time: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    open_price: Mapped[Decimal] = mapped_column(Numeric(18, 5), nullable=False)
    close_price: Mapped[Decimal] = mapped_column(Numeric(18, 5), nullable=False)
    lot_size: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    profit_loss: Mapped[Decimal] = mapped_column(Numeric(18, 2), nullable=False)
    commission: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    swap: Mapped[Decimal] = mapped_column(Numeric(18, 2), default=0)
    pips: Mapped[Decimal | None] = mapped_column(Numeric(10, 1), nullable=True)
    duration_seconds: Mapped[int | None] = mapped_column(Integer, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    account: Mapped["Account"] = relationship("Account", back_populates="trades")
    psychology: Mapped["PsychologyLog | None"] = relationship("PsychologyLog", back_populates="trade", uselist=False)