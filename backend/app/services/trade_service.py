from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from fastapi import HTTPException, status
from uuid import UUID
from typing import Optional

from app.models.account import Account
from app.models.trade import Trade
from app.models.user import User
from app.schemas.account import CreateAccountRequest, UpdateAccountRequest


# ─── ACCOUNT OPERATIONS ──────────────────────────────────────────────────────

async def get_user_accounts(db: AsyncSession, user_id: UUID) -> list[Account]:
    result = await db.execute(
        select(Account).where(Account.user_id == user_id)
    )
    return result.scalars().all()


async def create_account(
    db: AsyncSession, user_id: UUID, data: CreateAccountRequest, user_plan: str
) -> Account:
    # Free plan: max 1 account
    if user_plan == "free":
        result = await db.execute(
            select(func.count()).where(Account.user_id == user_id)
        )
        count = result.scalar()
        if count >= 1:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Free plan allows 1 trading account. Upgrade to Pro for up to 5 accounts.",
            )

    # Pro plan: max 5 accounts
    if user_plan == "pro":
        result = await db.execute(
            select(func.count()).where(Account.user_id == user_id)
        )
        count = result.scalar()
        if count >= 5:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum of 5 trading accounts allowed.",
            )

    # First account is default
    existing = await db.execute(select(func.count()).where(Account.user_id == user_id))
    is_default = existing.scalar() == 0

    account = Account(
        user_id=user_id,
        account_name=data.account_name,
        broker=data.broker,
        account_number=data.account_number,
        currency=data.currency,
        is_default=is_default,
    )
    db.add(account)
    await db.commit()
    await db.refresh(account)
    return account


async def get_account_or_404(
    db: AsyncSession, account_id: UUID, user_id: UUID
) -> Account:
    result = await db.execute(
        select(Account).where(
            Account.id == account_id,
            Account.user_id == user_id,
        )
    )
    account = result.scalar_one_or_none()
    if not account:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Account not found",
        )
    return account


async def update_account(
    db: AsyncSession, account_id: UUID, user_id: UUID, data: UpdateAccountRequest
) -> Account:
    account = await get_account_or_404(db, account_id, user_id)
    if data.account_name is not None:
        account.account_name = data.account_name
    if data.broker is not None:
        account.broker = data.broker
    if data.currency is not None:
        account.currency = data.currency
    await db.commit()
    await db.refresh(account)
    return account


async def delete_account(db: AsyncSession, account_id: UUID, user_id: UUID) -> None:
    account = await get_account_or_404(db, account_id, user_id)
    await db.delete(account)
    await db.commit()


# ─── TRADE OPERATIONS ────────────────────────────────────────────────────────

async def get_trades(
    db: AsyncSession,
    account_id: UUID,
    user_id: UUID,
    page: int = 1,
    limit: int = 50,
    symbol: Optional[str] = None,
    direction: Optional[str] = None,
) -> dict:
    # Verify account belongs to user
    await get_account_or_404(db, account_id, user_id)

    offset = (page - 1) * limit

    filters = [
        Trade.account_id == account_id,
        Trade.deleted_at == None,
    ]
    if symbol:
        filters.append(Trade.symbol == symbol.upper())
    if direction:
        filters.append(Trade.direction == direction.lower())

    # Total count
    count_result = await db.execute(
        select(func.count()).select_from(Trade).where(and_(*filters))
    )
    total = count_result.scalar()

    # Trades
    result = await db.execute(
        select(Trade)
        .where(and_(*filters))
        .order_by(Trade.open_time.desc())
        .offset(offset)
        .limit(limit)
    )
    trades = result.scalars().all()

    return {
        "trades": trades,
        "total": total,
        "page": page,
        "limit": limit,
        "pages": (total + limit - 1) // limit,
    }


async def get_trade_or_404(
    db: AsyncSession, trade_id: UUID, user_id: UUID
) -> Trade:
    result = await db.execute(
        select(Trade)
        .join(Account, Trade.account_id == Account.id)
        .where(
            Trade.id == trade_id,
            Trade.deleted_at == None,
            Account.user_id == user_id,
        )
    )
    trade = result.scalar_one_or_none()
    if not trade:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Trade not found",
        )
    return trade


async def soft_delete_trade(
    db: AsyncSession, trade_id: UUID, user_id: UUID
) -> None:
    from datetime import datetime, timezone
    trade = await get_trade_or_404(db, trade_id, user_id)
    trade.deleted_at = datetime.now(timezone.utc)
    await db.commit()