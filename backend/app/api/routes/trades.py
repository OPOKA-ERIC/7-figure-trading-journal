from fastapi import APIRouter, Depends, UploadFile, File, Form, status, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from uuid import UUID
from typing import Optional, List
from datetime import datetime, timezone

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.trade import Trade
from app.models.account import Account
from app.schemas.trade import TradeResponse, TradeWithPsychology, ImportSummary, TradeListResponse
from app.services import trade_service, import_service

router = APIRouter()

FREE_PLAN_MONTHLY_LIMIT = 50


async def _check_free_plan_limit(db: AsyncSession, user: User) -> None:
    """Raise 403 if free user has hit 50 trades this calendar month."""
    if user.plan == "pro":
        return

    now = datetime.now(timezone.utc)
    month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

    result = await db.execute(
        select(func.count(Trade.id))
        .join(Account, Trade.account_id == Account.id)
        .where(
            Account.user_id == user.id,
            Trade.created_at >= month_start,
            Trade.deleted_at == None,
        )
    )
    count = result.scalar() or 0

    if count >= FREE_PLAN_MONTHLY_LIMIT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Free plan limit reached: {FREE_PLAN_MONTHLY_LIMIT} trades per month. Upgrade to Pro for unlimited trades.",
        )


@router.get("", response_model=TradeListResponse)
async def list_trades(
    account_id: UUID,
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200),
    symbol: Optional[str] = None,
    direction: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await trade_service.get_trades(
        db, account_id, current_user.id, page, limit, symbol, direction
    )
    return result


@router.get("/{trade_id}", response_model=TradeWithPsychology)
async def get_trade(
    trade_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trade = await trade_service.get_trade_or_404(db, trade_id, current_user.id)

    # Build response with psychology if exists
    trade_data = TradeWithPsychology.model_validate(trade)
    if trade.psychology:
        trade_data.emotion = trade.psychology.emotion
        trade_data.followed_plan = trade.psychology.followed_plan
        trade_data.mistake_type = trade.psychology.mistake_type
        trade_data.notes = trade.psychology.notes
    return trade_data


@router.delete("/{trade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_trade(
    trade_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await trade_service.soft_delete_trade(db, trade_id, current_user.id)


@router.post("/import", response_model=ImportSummary)
async def import_trades(
    account_id: UUID = Form(...),
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify account belongs to user
    await trade_service.get_account_or_404(db, account_id, current_user.id)

    # Check free plan monthly limit
    await _check_free_plan_limit(db, current_user)

    # Read file
    content = await file.read()
    if len(content) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    # Parse
    rows, errors = import_service.parse_mt5_file(content, file.filename)
    print(f"[IMPORT] parsed {len(rows)} rows, {len(errors)} errors")
    if errors:
        print(f"[IMPORT] errors: {errors[:5]}")

    if not rows and errors:
        raise HTTPException(
            status_code=400,
            detail=f"Could not parse file: {errors[0]}",
        )

    # Import to DB
    result = await import_service.import_trades(db, account_id, rows)

    return ImportSummary(
        imported=result["imported"],
        skipped_duplicates=result["skipped_duplicates"],
        errors=len(errors),
        total_rows=len(rows) + len(errors),
    )