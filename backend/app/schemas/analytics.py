from pydantic import BaseModel
from typing import List, Optional
from decimal import Decimal
from datetime import date, datetime


class OverviewResponse(BaseModel):
    total_trades: int
    winning_trades: int
    losing_trades: int
    breakeven_trades: int
    win_rate: float
    profit_factor: float
    total_pnl: float
    average_win: float
    average_loss: float
    average_rr: float
    largest_win: float
    largest_loss: float
    max_drawdown: float
    max_drawdown_percent: float
    current_streak: int
    current_streak_type: str  # "win", "loss", "none"
    best_day_pnl: float
    worst_day_pnl: float


class EquityCurvePoint(BaseModel):
    date: str
    cumulative_pnl: float
    daily_pnl: float
    trade_count: int


class EquityCurveResponse(BaseModel):
    points: List[EquityCurvePoint]
    starting_balance: float
    ending_balance: float
    peak_balance: float
    max_drawdown: float


class SymbolBreakdown(BaseModel):
    symbol: str
    total_trades: int
    winning_trades: int
    win_rate: float
    total_pnl: float
    average_pnl: float
    profit_factor: float


class SymbolBreakdownResponse(BaseModel):
    symbols: List[SymbolBreakdown]


class DayBreakdown(BaseModel):
    day: str  # Monday, Tuesday, etc.
    day_number: int
    total_trades: int
    winning_trades: int
    win_rate: float
    total_pnl: float
    average_pnl: float


class DayBreakdownResponse(BaseModel):
    days: List[DayBreakdown]


class HourBreakdown(BaseModel):
    hour: int
    label: str  # "08:00", "09:00", etc.
    total_trades: int
    winning_trades: int
    win_rate: float
    total_pnl: float


class HourBreakdownResponse(BaseModel):
    hours: List[HourBreakdown]


class SessionBreakdown(BaseModel):
    session: str
    total_trades: int
    winning_trades: int
    win_rate: float
    total_pnl: float
    average_pnl: float


class SessionBreakdownResponse(BaseModel):
    sessions: List[SessionBreakdown]


class StreakAnalysis(BaseModel):
    longest_win_streak: int
    longest_loss_streak: int
    current_streak: int
    current_streak_type: str
    average_win_streak: float
    average_loss_streak: float


class DisciplineBreakdown(BaseModel):
    score: int
    rule_compliance_score: int
    risk_consistency_score: int
    emotional_quality_score: int
    volume_discipline_score: int
    rule_compliance_rate: float
    risk_consistency_rate: float
    emotional_quality_rate: float
    volume_discipline_rate: float
    total_tagged_trades: int
    total_trades: int