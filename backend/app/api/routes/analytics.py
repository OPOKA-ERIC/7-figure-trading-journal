from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_
from uuid import UUID
from typing import Optional
from datetime import datetime

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.account import Account
from app.models.detection import BehavioralDetection
from app.schemas.analytics import (
    OverviewResponse, EquityCurveResponse, SymbolBreakdownResponse,
    DayBreakdownResponse, HourBreakdownResponse, SessionBreakdownResponse,
    StreakAnalysis, DisciplineBreakdown,
)
from app.services import analytics_service, detection_service
from app.services.trade_service import get_account_or_404
router = APIRouter()


async def get_trades_for_account(
    account_id: UUID,
    date_from: Optional[datetime],
    date_to: Optional[datetime],
    current_user: User,
    db: AsyncSession,
):
    await get_account_or_404(db, account_id, current_user.id)
    return await analytics_service.get_trades_for_analytics(
        db, account_id, date_from, date_to
    )


@router.get("/overview", response_model=OverviewResponse)
async def get_overview(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return analytics_service.calculate_overview(trades)


@router.get("/equity-curve", response_model=EquityCurveResponse)
async def get_equity_curve(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return analytics_service.calculate_equity_curve(trades)


@router.get("/by-symbol", response_model=SymbolBreakdownResponse)
async def get_by_symbol(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return analytics_service.calculate_by_symbol(trades)


@router.get("/by-day", response_model=DayBreakdownResponse)
async def get_by_day(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return analytics_service.calculate_by_day(trades)


@router.get("/by-hour", response_model=HourBreakdownResponse)
async def get_by_hour(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return analytics_service.calculate_by_hour(trades)


@router.get("/by-session", response_model=SessionBreakdownResponse)
async def get_by_session(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return analytics_service.calculate_by_session(trades)


@router.get("/streaks", response_model=StreakAnalysis)
async def get_streaks(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return analytics_service.calculate_streaks(trades)


@router.get("/discipline", response_model=DisciplineBreakdown)
async def get_discipline(
    account_id: UUID,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    trades = await get_trades_for_account(account_id, date_from, date_to, current_user, db)
    return await analytics_service.calculate_discipline_score(db, account_id, trades)
@router.post("/run-detections")
async def run_detections(
    account_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Run all behavioral detection algorithms for an account."""
    await get_account_or_404(db, account_id, current_user.id)
    trades = await analytics_service.get_trades_for_analytics(db, account_id)
    result = await detection_service.run_all_detections(
        db, account_id, current_user.id, trades
    )
    return result


@router.get("/detections")
async def get_detections(
    account_id: UUID,
    acknowledged: Optional[bool] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get all behavioral detections for an account."""
    await get_account_or_404(db, account_id, current_user.id)

    filters = [BehavioralDetection.account_id == account_id]
    if acknowledged is not None:
        filters.append(BehavioralDetection.acknowledged == acknowledged)

    from sqlalchemy import and_
    result = await db.execute(
        select(BehavioralDetection)
        .where(and_(*filters))
        .order_by(BehavioralDetection.detected_at.desc())
    )
    detections = result.scalars().all()

    return [
        {
            "id": str(d.id),
            "detection_type": d.detection_type,
            "detected_at": d.detected_at.isoformat(),
            "detail": d.detail,
            "acknowledged": d.acknowledged,
            "trigger_trade_count": len(d.trigger_trade_ids),
        }
        for d in detections
    ]


@router.patch("/detections/{detection_id}/acknowledge")
async def acknowledge_detection(
    detection_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Mark a detection as acknowledged."""
    result = await db.execute(
        select(BehavioralDetection)
        .join(Account, BehavioralDetection.account_id == Account.id)
        .where(
            BehavioralDetection.id == detection_id,
            Account.user_id == current_user.id,
        )
    )
    detection = result.scalar_one_or_none()
    if not detection:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Detection not found")

    detection.acknowledged = True
    await db.commit()
    return {"message": "Detection acknowledged"}