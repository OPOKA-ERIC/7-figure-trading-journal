from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional
from datetime import datetime, timezone, timedelta
from decimal import Decimal

from app.models.trade import Trade
from app.models.psychology import PsychologyLog
from app.models.account import Account
from app.services.trade_service import get_account_or_404


def get_session_for_hour(hour: int, minute: int = 0) -> str:
    """Classify a UTC hour into trading session."""
    time_val = hour * 60 + minute
    if 0 <= time_val < 540:
        return "Asian"
    if 420 <= time_val < 960:
        return "London"
    if 720 <= time_val < 1260:
        return "New York"
    return "Off Session"


async def get_trades_for_analytics(
    db: AsyncSession,
    account_id,
    date_from: Optional[datetime] = None,
    date_to: Optional[datetime] = None,
) -> list[Trade]:
    filters = [
        Trade.account_id == account_id,
        Trade.deleted_at == None,
    ]
    if date_from:
        filters.append(Trade.close_time >= date_from)
    if date_to:
        filters.append(Trade.close_time <= date_to)

    result = await db.execute(
        select(Trade)
        .where(and_(*filters))
        .order_by(Trade.close_time.asc())
    )
    return result.scalars().all()


def calculate_overview(trades: list[Trade]) -> dict:
    if not trades:
        return {
            "total_trades": 0, "winning_trades": 0, "losing_trades": 0,
            "breakeven_trades": 0, "win_rate": 0.0, "profit_factor": 0.0,
            "total_pnl": 0.0, "average_win": 0.0, "average_loss": 0.0,
            "average_rr": 0.0, "largest_win": 0.0, "largest_loss": 0.0,
            "max_drawdown": 0.0, "max_drawdown_percent": 0.0,
            "current_streak": 0, "current_streak_type": "none",
            "best_day_pnl": 0.0, "worst_day_pnl": 0.0,
        }

    pnls = [float(t.profit_loss) for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p < 0]
    breakevens = [p for p in pnls if p == 0]

    total_pnl = sum(pnls)
    gross_profit = sum(wins) if wins else 0
    gross_loss = abs(sum(losses)) if losses else 0

    profit_factor = round(gross_profit / gross_loss, 2) if gross_loss > 0 else (999.0 if gross_profit > 0 else 0.0)
    win_rate = round(len(wins) / len(pnls) * 100, 2) if pnls else 0.0

    cumulative = 0.0
    peak = 0.0
    max_dd = 0.0
    peak_val = 0.0
    for p in pnls:
        cumulative += p
        if cumulative > peak:
            peak = cumulative
            peak_val = peak
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd
    max_dd_pct = round((max_dd / peak_val * 100), 2) if peak_val > 0 else 0.0

    streak = 0
    streak_type = "none"
    if pnls:
        last_type = "win" if pnls[-1] > 0 else "loss"
        streak_type = last_type
        for p in reversed(pnls):
            current_type = "win" if p > 0 else "loss"
            if current_type == last_type:
                streak += 1
            else:
                break

    day_pnl: dict[str, float] = {}
    for trade in trades:
        day = trade.close_time.strftime("%Y-%m-%d")
        day_pnl[day] = day_pnl.get(day, 0.0) + float(trade.profit_loss)

    best_day = max(day_pnl.values()) if day_pnl else 0.0
    worst_day = min(day_pnl.values()) if day_pnl else 0.0

    return {
        "total_trades": len(trades),
        "winning_trades": len(wins),
        "losing_trades": len(losses),
        "breakeven_trades": len(breakevens),
        "win_rate": win_rate,
        "profit_factor": profit_factor,
        "total_pnl": round(total_pnl, 2),
        "average_win": round(sum(wins) / len(wins), 2) if wins else 0.0,
        "average_loss": round(sum(losses) / len(losses), 2) if losses else 0.0,
        "average_rr": round(
            (sum(wins) / len(wins)) / abs(sum(losses) / len(losses)), 2
        ) if wins and losses else 0.0,
        "largest_win": round(max(wins), 2) if wins else 0.0,
        "largest_loss": round(min(losses), 2) if losses else 0.0,
        "max_drawdown": round(max_dd, 2),
        "max_drawdown_percent": max_dd_pct,
        "current_streak": streak,
        "current_streak_type": streak_type,
        "best_day_pnl": round(best_day, 2),
        "worst_day_pnl": round(worst_day, 2),
    }


def calculate_equity_curve(trades: list[Trade]) -> dict:
    if not trades:
        return {
            "points": [],
            "starting_balance": 0.0,
            "ending_balance": 0.0,
            "peak_balance": 0.0,
            "max_drawdown": 0.0,
        }

    day_data: dict[str, dict] = {}
    for trade in trades:
        day = trade.close_time.strftime("%Y-%m-%d")
        if day not in day_data:
            day_data[day] = {"daily_pnl": 0.0, "trade_count": 0}
        day_data[day]["daily_pnl"] += float(trade.profit_loss)
        day_data[day]["trade_count"] += 1

    points = []
    cumulative = 0.0
    peak = 0.0
    max_dd = 0.0

    for day in sorted(day_data.keys()):
        cumulative += day_data[day]["daily_pnl"]
        if cumulative > peak:
            peak = cumulative
        dd = peak - cumulative
        if dd > max_dd:
            max_dd = dd
        points.append({
            "date": day,
            "cumulative_pnl": round(cumulative, 2),
            "daily_pnl": round(day_data[day]["daily_pnl"], 2),
            "trade_count": day_data[day]["trade_count"],
        })

    return {
        "points": points,
        "starting_balance": 0.0,
        "ending_balance": round(cumulative, 2),
        "peak_balance": round(peak, 2),
        "max_drawdown": round(max_dd, 2),
    }


def calculate_by_symbol(trades: list[Trade]) -> dict:
    symbol_data: dict[str, dict] = {}

    for trade in trades:
        sym = trade.symbol
        if sym not in symbol_data:
            symbol_data[sym] = {"trades": [], "wins": [], "losses": []}
        pnl = float(trade.profit_loss)
        symbol_data[sym]["trades"].append(pnl)
        if pnl > 0:
            symbol_data[sym]["wins"].append(pnl)
        elif pnl < 0:
            symbol_data[sym]["losses"].append(pnl)

    symbols = []
    for sym, data in symbol_data.items():
        t = data["trades"]
        w = data["wins"]
        lo = data["losses"]
        gross_profit = sum(w) if w else 0
        gross_loss = abs(sum(lo)) if lo else 0
        pf = round(gross_profit / gross_loss, 2) if gross_loss > 0 else (999.0 if gross_profit > 0 else 0.0)
        symbols.append({
            "symbol": sym,
            "total_trades": len(t),
            "winning_trades": len(w),
            "win_rate": round(len(w) / len(t) * 100, 2) if t else 0.0,
            "total_pnl": round(sum(t), 2),
            "average_pnl": round(sum(t) / len(t), 2) if t else 0.0,
            "profit_factor": pf,
        })

    symbols.sort(key=lambda x: x["total_pnl"], reverse=True)
    return {"symbols": symbols}


def calculate_by_day(trades: list[Trade]) -> dict:
    day_names = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    day_data: dict[int, dict] = {i: {"trades": [], "wins": []} for i in range(7)}

    for trade in trades:
        dow = trade.close_time.weekday()
        pnl = float(trade.profit_loss)
        day_data[dow]["trades"].append(pnl)
        if pnl > 0:
            day_data[dow]["wins"].append(pnl)

    days = []
    for dow in range(7):
        t = day_data[dow]["trades"]
        w = day_data[dow]["wins"]
        days.append({
            "day": day_names[dow],
            "day_number": dow,
            "total_trades": len(t),
            "winning_trades": len(w),
            "win_rate": round(len(w) / len(t) * 100, 2) if t else 0.0,
            "total_pnl": round(sum(t), 2) if t else 0.0,
            "average_pnl": round(sum(t) / len(t), 2) if t else 0.0,
        })

    return {"days": days}


def calculate_by_hour(trades: list[Trade]) -> dict:
    hour_data: dict[int, dict] = {i: {"trades": [], "wins": []} for i in range(24)}

    for trade in trades:
        hour = trade.open_time.hour
        pnl = float(trade.profit_loss)
        hour_data[hour]["trades"].append(pnl)
        if pnl > 0:
            hour_data[hour]["wins"].append(pnl)

    hours = []
    for h in range(24):
        t = hour_data[h]["trades"]
        w = hour_data[h]["wins"]
        if not t:
            continue
        hours.append({
            "hour": h,
            "label": f"{h:02d}:00",
            "total_trades": len(t),
            "winning_trades": len(w),
            "win_rate": round(len(w) / len(t) * 100, 2) if t else 0.0,
            "total_pnl": round(sum(t), 2),
        })

    return {"hours": hours}


def calculate_by_session(trades: list[Trade]) -> dict:
    session_data: dict[str, dict] = {}

    for trade in trades:
        session = get_session_for_hour(trade.open_time.hour, trade.open_time.minute)
        if session not in session_data:
            session_data[session] = {"trades": [], "wins": []}
        pnl = float(trade.profit_loss)
        session_data[session]["trades"].append(pnl)
        if pnl > 0:
            session_data[session]["wins"].append(pnl)

    sessions = []
    for session, data in session_data.items():
        t = data["trades"]
        w = data["wins"]
        sessions.append({
            "session": session,
            "total_trades": len(t),
            "winning_trades": len(w),
            "win_rate": round(len(w) / len(t) * 100, 2) if t else 0.0,
            "total_pnl": round(sum(t), 2),
            "average_pnl": round(sum(t) / len(t), 2) if t else 0.0,
        })

    sessions.sort(key=lambda x: x["total_pnl"], reverse=True)
    return {"sessions": sessions}


def calculate_streaks(trades: list[Trade]) -> dict:
    if not trades:
        return {
            "longest_win_streak": 0, "longest_loss_streak": 0,
            "current_streak": 0, "current_streak_type": "none",
            "average_win_streak": 0.0, "average_loss_streak": 0.0,
        }

    pnls = [float(t.profit_loss) for t in trades]
    win_streaks = []
    loss_streaks = []
    current = 1
    current_type = "win" if pnls[0] > 0 else "loss"

    for i in range(1, len(pnls)):
        this_type = "win" if pnls[i] > 0 else "loss"
        if this_type == current_type:
            current += 1
        else:
            if current_type == "win":
                win_streaks.append(current)
            else:
                loss_streaks.append(current)
            current = 1
            current_type = this_type

    if current_type == "win":
        win_streaks.append(current)
    else:
        loss_streaks.append(current)

    streak = 0
    last_type = "win" if pnls[-1] > 0 else "loss"
    for p in reversed(pnls):
        t = "win" if p > 0 else "loss"
        if t == last_type:
            streak += 1
        else:
            break

    return {
        "longest_win_streak": max(win_streaks) if win_streaks else 0,
        "longest_loss_streak": max(loss_streaks) if loss_streaks else 0,
        "current_streak": streak,
        "current_streak_type": last_type,
        "average_win_streak": round(sum(win_streaks) / len(win_streaks), 2) if win_streaks else 0.0,
        "average_loss_streak": round(sum(loss_streaks) / len(loss_streaks), 2) if loss_streaks else 0.0,
    }


async def calculate_discipline_score(
    db: AsyncSession,
    account_id,
    trades: list[Trade],
) -> dict:
    if not trades:
        return {
            "score": 0, "rule_compliance_score": 0, "risk_consistency_score": 0,
            "emotional_quality_score": 0, "volume_discipline_score": 0,
            "rule_compliance_rate": 0.0, "risk_consistency_rate": 0.0,
            "emotional_quality_rate": 0.0, "volume_discipline_rate": 0.0,
            "total_tagged_trades": 0, "total_trades": 0,
        }

    trade_ids = [t.id for t in trades]

    # Get psychology logs — use UUID objects directly, no string conversion
    result = await db.execute(
        select(PsychologyLog).where(PsychologyLog.trade_id.in_(trade_ids))
    )
    logs = result.scalars().all()

    # Key by UUID object directly
    log_map = {log.trade_id: log for log in logs}
    tagged = [t for t in trades if t.id in log_map]
    total_tagged = len(tagged)

    if total_tagged == 0:
        return {
            "score": 0, "rule_compliance_score": 0, "risk_consistency_score": 0,
            "emotional_quality_score": 0, "volume_discipline_score": 0,
            "rule_compliance_rate": 0.0, "risk_consistency_rate": 0.0,
            "emotional_quality_rate": 0.0, "volume_discipline_rate": 0.0,
            "total_tagged_trades": 0, "total_trades": len(trades),
        }

    # Component 1: Rule compliance (40%)
    followed = sum(1 for t in tagged if log_map[t.id].followed_plan in ("yes", "partially"))
    compliance_rate = followed / total_tagged
    compliance_score = round(compliance_rate * 40)

    # Component 2: Risk consistency (30%)
    lot_sizes = [float(t.lot_size) for t in trades]
    if len(lot_sizes) >= 5:
        avg_lot = sum(lot_sizes) / len(lot_sizes)
        consistent = sum(1 for ls in lot_sizes if ls <= avg_lot * 1.5)
        consistency_rate = consistent / len(lot_sizes)
    else:
        consistency_rate = 1.0
    consistency_score = round(consistency_rate * 30)

    # Component 3: Emotional quality (20%)
    negative_emotions = {"anxious", "frustrated", "fearful", "greedy"}
    emotion_logs = [log_map[t.id] for t in tagged if log_map[t.id].emotion]
    if emotion_logs:
        positive = sum(1 for log in emotion_logs if log.emotion not in negative_emotions)
        emotional_rate = positive / len(emotion_logs)
    else:
        emotional_rate = 0.5
    emotional_score = round(emotional_rate * 20)

    # Component 4: Volume discipline (10%)
    tagging_rate = total_tagged / len(trades)
    volume_score = round(tagging_rate * 10)

    total_score = compliance_score + consistency_score + emotional_score + volume_score

    return {
        "score": min(total_score, 100),
        "rule_compliance_score": compliance_score,
        "risk_consistency_score": consistency_score,
        "emotional_quality_score": emotional_score,
        "volume_discipline_score": volume_score,
        "rule_compliance_rate": round(compliance_rate * 100, 2),
        "risk_consistency_rate": round(consistency_rate * 100, 2),
        "emotional_quality_rate": round(emotional_rate * 100, 2),
        "volume_discipline_rate": round(tagging_rate * 100, 2),
        "total_tagged_trades": total_tagged,
        "total_trades": len(trades),
    }