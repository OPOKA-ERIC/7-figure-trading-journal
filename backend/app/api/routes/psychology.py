from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from uuid import UUID

from app.db.session import get_db
from app.core.dependencies import get_current_user
from app.models.user import User
from app.models.psychology import PsychologyLog
from app.schemas.psychology import PsychologyLogRequest, PsychologyLogResponse
from app.services.trade_service import get_trade_or_404

router = APIRouter()


@router.post("/{trade_id}", response_model=PsychologyLogResponse)
async def upsert_psychology_log(
    trade_id: UUID,
    data: PsychologyLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    # Verify trade belongs to user
    await get_trade_or_404(db, trade_id, current_user.id)

    # Check if log already exists
    result = await db.execute(
        select(PsychologyLog).where(PsychologyLog.trade_id == trade_id)
    )
    log = result.scalar_one_or_none()

    if log:
        # Update existing
        if data.emotion is not None:
            log.emotion = data.emotion
        if data.followed_plan is not None:
            log.followed_plan = data.followed_plan
        if data.mistake_type is not None:
            log.mistake_type = data.mistake_type
        if data.notes is not None:
            log.notes = data.notes
    else:
        # Create new
        log = PsychologyLog(
            trade_id=trade_id,
            emotion=data.emotion,
            followed_plan=data.followed_plan,
            mistake_type=data.mistake_type,
            notes=data.notes,
        )
        db.add(log)

    await db.commit()
    await db.refresh(log)
    return log


@router.get("/{trade_id}", response_model=PsychologyLogResponse)
async def get_psychology_log(
    trade_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await get_trade_or_404(db, trade_id, current_user.id)

    result = await db.execute(
        select(PsychologyLog).where(PsychologyLog.trade_id == trade_id)
    )
    log = result.scalar_one_or_none()

    if not log:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="No psychology log for this trade yet")

    return log