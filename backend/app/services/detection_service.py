from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from app.models.trade import Trade
from app.models.psychology import PsychologyLog
from app.models.detection import BehavioralDetection
from app.models.rules import UserTradingRules


async def get_user_rules(db: AsyncSession, user_id) -> UserTradingRules:
    result = await db.execute(
        select(UserTradingRules).where(UserTradingRules.user_id == user_id)
    )
    rules = result.scalar_one_or_none()
    if not rules:
        # Return defaults if no rules set
        rules = UserTradingRules(
            user_id=user_id,
            max_daily_trades=5,
            max_risk_percent=2.0,
            trading_session="any",
        )
    return rules


async def save_detection(
    db: AsyncSession,
    account_id,
    detection_type: str,
    trigger_trade_ids: list,
    detail: dict,
) -> BehavioralDetection:
    detection = BehavioralDetection(
        account_id=account_id,
        detection_type=detection_type,
        trigger_trade_ids=[str(tid) for tid in trigger_trade_ids],
        detail=detail,
    )
    db.add(detection)
    await db.commit()
    await db.refresh(detection)
    return detection


async def check_existing_detection(
    db: AsyncSession,
    account_id,
    detection_type: str,
    trade_id,
) -> bool:
    """Check if this exact detection already exists to avoid duplicates."""
    result = await db.execute(
        select(BehavioralDetection).where(
            BehavioralDetection.account_id == account_id,
            BehavioralDetection.detection_type == detection_type,
            BehavioralDetection.trigger_trade_ids.contains([str(trade_id)]),
        )
    )
    return result.scalar_one_or_none() is not None


# ─── ALGORITHM 1: REVENGE TRADE ──────────────────────────────────────────────

async def detect_revenge_trades(
    db: AsyncSession,
    account_id,
    trades: list[Trade],
) -> list[BehavioralDetection]:
    """
    Revenge trade: new trade opened within 15 minutes of a losing trade
    AND lot size >= 1.5x the losing trade's lot size.
    """
    detections = []
    sorted_trades = sorted(trades, key=lambda t: t.open_time)

    for i, trade in enumerate(sorted_trades):
        # Look back at recently closed losing trades
        for prev in reversed(sorted_trades[:i]):
            # Only look back 15 minutes
            gap = (trade.open_time - prev.close_time).total_seconds() / 60
            if gap < 0 or gap > 15:
                continue

            # Previous trade must be a loss
            if float(prev.profit_loss) >= 0:
                continue

            # Lot size must be >= 1.5x the losing trade
            lot_ratio = float(trade.lot_size) / float(prev.lot_size) if float(prev.lot_size) > 0 else 0
            if lot_ratio >= 1.5:
                # Check not already detected
                already = await check_existing_detection(
                    db, account_id, "revenge_trade", trade.id
                )
                if not already:
                    detection = await save_detection(
                        db=db,
                        account_id=account_id,
                        detection_type="revenge_trade",
                        trigger_trade_ids=[prev.id, trade.id],
                        detail={
                            "minutes_since_loss": round(gap, 1),
                            "lot_ratio": round(lot_ratio, 2),
                            "losing_trade_pnl": float(prev.profit_loss),
                            "losing_trade_symbol": prev.symbol,
                            "revenge_trade_symbol": trade.symbol,
                            "message": f"Trade opened {round(gap, 1)} minutes after a loss with {round(lot_ratio, 2)}x lot size increase.",
                        },
                    )
                    detections.append(detection)
                break

    return detections


# ─── ALGORITHM 2: OVERTRADING ─────────────────────────────────────────────────

async def detect_overtrading(
    db: AsyncSession,
    account_id,
    trades: list[Trade],
    max_daily_trades: int = 5,
) -> list[BehavioralDetection]:
    """
    Overtrading: more trades than max_daily_trades on any single day.
    """
    detections = []

    # Group trades by date
    day_trades: dict[str, list[Trade]] = {}
    for trade in trades:
        day = trade.open_time.strftime("%Y-%m-%d")
        if day not in day_trades:
            day_trades[day] = []
        day_trades[day].append(trade)

    for day, day_trade_list in day_trades.items():
        if len(day_trade_list) > max_daily_trades:
            trade_ids = [t.id for t in day_trade_list]

            # Check not already detected for this day
            already = await check_existing_detection(
                db, account_id, "overtrading", trade_ids[0]
            )
            if not already:
                detection = await save_detection(
                    db=db,
                    account_id=account_id,
                    detection_type="overtrading",
                    trigger_trade_ids=trade_ids,
                    detail={
                        "date": day,
                        "trade_count": len(day_trade_list),
                        "limit": max_daily_trades,
                        "excess": len(day_trade_list) - max_daily_trades,
                        "message": f"You placed {len(day_trade_list)} trades on {day}. Your limit is {max_daily_trades}.",
                    },
                )
                detections.append(detection)

    return detections


# ─── ALGORITHM 3: RISK SPIKE ─────────────────────────────────────────────────

async def detect_risk_spikes(
    db: AsyncSession,
    account_id,
    trades: list[Trade],
) -> list[BehavioralDetection]:
    """
    Risk spike: lot size > 1.75x the rolling 10-trade average.
    Requires at least 5 previous trades.
    """
    detections = []
    sorted_trades = sorted(trades, key=lambda t: t.open_time)

    for i, trade in enumerate(sorted_trades):
        if i < 5:
            continue  # Need at least 5 previous trades

        # Rolling 10-trade average (excluding current trade)
        lookback = sorted_trades[max(0, i - 10):i]
        avg_lot = sum(float(t.lot_size) for t in lookback) / len(lookback)

        if avg_lot == 0:
            continue

        ratio = float(trade.lot_size) / avg_lot

        if ratio >= 1.75:
            already = await check_existing_detection(
                db, account_id, "risk_spike", trade.id
            )
            if not already:
                detection = await save_detection(
                    db=db,
                    account_id=account_id,
                    detection_type="risk_spike",
                    trigger_trade_ids=[trade.id],
                    detail={
                        "lot_size": float(trade.lot_size),
                        "baseline_average": round(avg_lot, 2),
                        "ratio": round(ratio, 2),
                        "symbol": trade.symbol,
                        "message": f"Lot size on {trade.symbol} was {round(ratio, 2)}x your recent average. Significant risk spike.",
                    },
                )
                detections.append(detection)

    return detections


# ─── ALGORITHM 4: EMOTIONAL SPIRAL ───────────────────────────────────────────

async def detect_emotional_spiral(
    db: AsyncSession,
    account_id,
    trades: list[Trade],
) -> list[BehavioralDetection]:
    """
    Emotional spiral: 3+ consecutive trades in same day tagged with
    negative emotions (anxious, frustrated, fearful, greedy).
    """
    detections = []
    negative_emotions = {"anxious", "frustrated", "fearful", "greedy"}

    # Get psychology logs for all trades
    trade_ids = [t.id for t in trades]
    if not trade_ids:
        return []

    result = await db.execute(
        select(PsychologyLog).where(PsychologyLog.trade_id.in_(trade_ids))
    )
    logs = result.scalars().all()
    log_map = {log.trade_id: log for log in logs}

    # Group trades by day, sorted by open_time
    day_trades: dict[str, list[Trade]] = {}
    for trade in trades:
        day = trade.open_time.strftime("%Y-%m-%d")
        if day not in day_trades:
            day_trades[day] = []
        day_trades[day].append(trade)

    for day, day_trade_list in day_trades.items():
        sorted_day = sorted(day_trade_list, key=lambda t: t.open_time)
        consecutive_negative = []

        for trade in sorted_day:
            log = log_map.get(trade.id)
            if log and log.emotion in negative_emotions:
                consecutive_negative.append(trade)
                if len(consecutive_negative) >= 3:
                    trigger_ids = [t.id for t in consecutive_negative]
                    already = await check_existing_detection(
                        db, account_id, "emotional_spiral", trigger_ids[0]
                    )
                    if not already:
                        emotions = [log_map[t.id].emotion for t in consecutive_negative if t.id in log_map]
                        detection = await save_detection(
                            db=db,
                            account_id=account_id,
                            detection_type="emotional_spiral",
                            trigger_trade_ids=trigger_ids,
                            detail={
                                "date": day,
                                "consecutive_count": len(consecutive_negative),
                                "emotions": emotions,
                                "message": f"{len(consecutive_negative)} consecutive trades in negative emotional states on {day}.",
                            },
                        )
                        detections.append(detection)
                    break
            else:
                consecutive_negative = []

    return detections


# ─── ALGORITHM 5: PLAN ABANDONMENT ───────────────────────────────────────────

async def detect_plan_abandonment(
    db: AsyncSession,
    account_id,
    trades: list[Trade],
) -> list[BehavioralDetection]:
    """
    Plan abandonment: more than 3 out of last 5 tagged trades have
    followed_plan = 'no'.
    """
    detections = []

    trade_ids = [t.id for t in trades]
    if not trade_ids:
        return []

    result = await db.execute(
        select(PsychologyLog).where(PsychologyLog.trade_id.in_(trade_ids))
    )
    logs = result.scalars().all()

    # Only tagged trades with a plan answer
    tagged_logs = [log for log in logs if log.followed_plan is not None]
    tagged_logs.sort(key=lambda l: l.created_at)

    if len(tagged_logs) < 5:
        return []

    # Check last 5 tagged trades
    last_5 = tagged_logs[-5:]
    broken = [log for log in last_5 if log.followed_plan == "no"]

    if len(broken) > 3:
        trigger_ids = [log.trade_id for log in last_5]
        already = await check_existing_detection(
            db, account_id, "plan_abandonment", trigger_ids[0]
        )
        if not already:
            detection = await save_detection(
                db=db,
                account_id=account_id,
                detection_type="plan_abandonment",
                trigger_trade_ids=trigger_ids,
                detail={
                    "broken_count": len(broken),
                    "window": 5,
                    "message": f"You broke your trading rules in {len(broken)} of your last 5 tagged trades.",
                },
            )
            detections.append(detection)

    return detections


# ─── ALGORITHM 6: LOSS RATE DECAY ────────────────────────────────────────────

async def detect_loss_rate_decay(
    db: AsyncSession,
    account_id,
    trades: list[Trade],
) -> list[BehavioralDetection]:
    """
    Loss rate decay: win rate of 5 trades after a 3+ loss streak drops below 35%.
    """
    detections = []
    sorted_trades = sorted(trades, key=lambda t: t.close_time)
    pnls = [float(t.profit_loss) for t in sorted_trades]

    i = 0
    while i < len(pnls):
        # Find a loss streak of 3+
        if pnls[i] < 0:
            streak_start = i
            streak_len = 0
            j = i
            while j < len(pnls) and pnls[j] < 0:
                streak_len += 1
                j += 1

            if streak_len >= 3:
                # Check the next 5 trades
                post_streak = sorted_trades[j:j + 5]
                if len(post_streak) >= 3:
                    post_wins = sum(1 for t in post_streak if float(t.profit_loss) > 0)
                    post_win_rate = post_wins / len(post_streak)

                    if post_win_rate < 0.35:
                        trigger_ids = [t.id for t in sorted_trades[streak_start:j]] + [t.id for t in post_streak]
                        already = await check_existing_detection(
                            db, account_id, "loss_rate_decay", sorted_trades[streak_start].id
                        )
                        if not already:
                            detection = await save_detection(
                                db=db,
                                account_id=account_id,
                                detection_type="loss_rate_decay",
                                trigger_trade_ids=trigger_ids,
                                detail={
                                    "loss_streak_length": streak_len,
                                    "post_streak_win_rate": round(post_win_rate * 100, 1),
                                    "post_streak_trades": len(post_streak),
                                    "message": f"Win rate dropped to {round(post_win_rate * 100, 1)}% in the {len(post_streak)} trades following a {streak_len}-trade loss streak.",
                                },
                            )
                            detections.append(detection)
            i = j
        else:
            i += 1

    return detections


# ─── MASTER RUNNER ────────────────────────────────────────────────────────────

async def run_all_detections(
    db: AsyncSession,
    account_id,
    user_id,
    trades: list[Trade],
) -> dict:
    """Run all detection algorithms and return summary."""
    rules = await get_user_rules(db, user_id)

    revenge = await detect_revenge_trades(db, account_id, trades)
    overtrading = await detect_overtrading(db, account_id, trades, rules.max_daily_trades)
    risk_spikes = await detect_risk_spikes(db, account_id, trades)
    emotional = await detect_emotional_spiral(db, account_id, trades)
    plan = await detect_plan_abandonment(db, account_id, trades)
    decay = await detect_loss_rate_decay(db, account_id, trades)

    all_detections = revenge + overtrading + risk_spikes + emotional + plan + decay

    return {
        "total": len(all_detections),
        "revenge_trades": len(revenge),
        "overtrading": len(overtrading),
        "risk_spikes": len(risk_spikes),
        "emotional_spirals": len(emotional),
        "plan_abandonments": len(plan),
        "loss_rate_decays": len(decay),
    }