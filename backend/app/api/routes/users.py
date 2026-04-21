from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional, List

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.rules import UserTradingRules
from app.schemas.user import UserResponse, UpdateProfileRequest, TradingRulesRequest, TradingRulesResponse

router = APIRouter()


@router.get("/me", response_model=UserResponse)
async def get_profile(current_user: User = Depends(get_current_user)):
    return current_user


@router.patch("/me", response_model=UserResponse)
async def update_profile(
    data: UpdateProfileRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.display_name is not None:
        current_user.display_name = data.display_name.strip()
    if data.timezone is not None:
        current_user.timezone = data.timezone

    await db.commit()
    await db.refresh(current_user)
    return current_user


@router.get("/me/rules", response_model=TradingRulesResponse)
async def get_rules(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserTradingRules).where(UserTradingRules.user_id == current_user.id)
    )
    rules = result.scalar_one_or_none()
    if not rules:
        # Return defaults without persisting
        return TradingRulesResponse(
            max_daily_trades=5,
            max_risk_percent=2.0,
            trading_session="any",
            session_start_utc=None,
            session_end_utc=None,
            custom_mistakes=[],
        )
    return rules


@router.put("/me/rules", response_model=TradingRulesResponse)
async def upsert_rules(
    data: TradingRulesRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserTradingRules).where(UserTradingRules.user_id == current_user.id)
    )
    rules = result.scalar_one_or_none()

    if rules:
        rules.max_daily_trades = data.max_daily_trades
        rules.max_risk_percent = data.max_risk_percent
        rules.trading_session = data.trading_session
        rules.session_start_utc = data.session_start_utc
        rules.session_end_utc = data.session_end_utc
        rules.custom_mistakes = data.custom_mistakes
    else:
        rules = UserTradingRules(
            user_id=current_user.id,
            max_daily_trades=data.max_daily_trades,
            max_risk_percent=data.max_risk_percent,
            trading_session=data.trading_session,
            session_start_utc=data.session_start_utc,
            session_end_utc=data.session_end_utc,
            custom_mistakes=data.custom_mistakes,
        )
        db.add(rules)

    await db.commit()
    await db.refresh(rules)
    return rules


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
async def delete_account(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    from datetime import datetime, timezone
    current_user.deleted_at = datetime.now(timezone.utc)
    await db.commit()