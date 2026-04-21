# Psychology logic lives in analytics_service and detection_service.
# This module re-exports the relevant functions for convenience.

from app.services.analytics_service import calculate_discipline_score
from app.services.detection_service import (
    detect_revenge_trades,
    detect_overtrading,
    detect_risk_spikes,
    detect_emotional_spiral,
    detect_plan_abandonment,
    detect_loss_rate_decay,
    run_all_detections,
)

__all__ = [
    "calculate_discipline_score",
    "detect_revenge_trades",
    "detect_overtrading",
    "detect_risk_spikes",
    "detect_emotional_spiral",
    "detect_plan_abandonment",
    "detect_loss_rate_decay",
    "run_all_detections",
]
