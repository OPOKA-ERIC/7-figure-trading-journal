from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime, timezone, timedelta

from app.models.user import User
from app.models.account import Account
from app.services.analytics_service import get_trades_for_analytics, calculate_overview, calculate_discipline_score
from app.services.detection_service import get_user_rules
from app.core.config import settings


def _build_weekly_email(name: str, data: dict) -> str:
    ov = data["overview"]
    disc = data["discipline"]
    detections = data["detections"]
    period = data["period"]

    pnl = ov["total_pnl"]
    pnl_str = f"+${pnl:.2f}" if pnl >= 0 else f"-${abs(pnl):.2f}"
    pnl_color = "#4ADE80" if pnl >= 0 else "#F87171"

    score = disc["score"]
    score_label = (
        "Excellent" if score >= 80 else
        "Good" if score >= 60 else
        "Fair" if score >= 40 else
        "Needs Work"
    )

    detection_lines = ""
    if detections:
        detection_lines = "<p style='color:#CBD5E1;font-size:14px;margin:0 0 8px;'><strong>Behavioural flags this week:</strong></p><ul style='color:#CBD5E1;font-size:13px;padding-left:20px;margin:0 0 20px;'>"
        for d in detections[:3]:
            detection_lines += f"<li style='margin-bottom:6px;'>{d['detail'].get('message', d['detection_type'].replace('_', ' ').title())}</li>"
        detection_lines += "</ul>"

    tip = _improvement_tip(disc, ov)

    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0D2137;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:40px 20px;">

    <!-- Header -->
    <div style="text-align:center;margin-bottom:32px;">
      <div style="display:inline-block;background:#2E86C1;border-radius:12px;padding:12px 16px;margin-bottom:16px;">
        <span style="color:white;font-size:18px;font-weight:700;">7FTJ</span>
      </div>
      <h1 style="color:white;font-size:22px;font-weight:700;margin:0 0 6px;">Weekly Report</h1>
      <p style="color:#5A7A95;font-size:13px;margin:0;">{period}</p>
    </div>

    <!-- Greeting -->
    <p style="color:#CBD5E1;font-size:15px;margin:0 0 24px;">Hey {name}, here's how your week looked.</p>

    <!-- Stats grid -->
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
      <div style="background:#132236;border:1px solid #1E3A5F;border-radius:12px;padding:18px;">
        <p style="color:#7A9BB5;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Weekly P&L</p>
        <p style="color:{pnl_color};font-size:24px;font-weight:700;margin:0;">{pnl_str}</p>
        <p style="color:#5A7A95;font-size:12px;margin:4px 0 0;">{ov['total_trades']} trades · {ov['win_rate']}% win rate</p>
      </div>
      <div style="background:#132236;border:1px solid #1E3A5F;border-radius:12px;padding:18px;">
        <p style="color:#7A9BB5;font-size:11px;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">Discipline Score</p>
        <p style="color:{'#4ADE80' if score >= 80 else '#FBBF24' if score >= 60 else '#F97316' if score >= 40 else '#F87171'};font-size:24px;font-weight:700;margin:0;">{score}/100</p>
        <p style="color:#5A7A95;font-size:12px;margin:4px 0 0;">{score_label}</p>
      </div>
    </div>

    <!-- More stats -->
    <div style="background:#132236;border:1px solid #1E3A5F;border-radius:12px;padding:18px;margin-bottom:24px;">
      <p style="color:white;font-size:13px;font-weight:600;margin:0 0 14px;">Performance Breakdown</p>
      {''.join([
        f"<div style='display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #0F1E2E;'><span style='color:#7A9BB5;font-size:13px;'>{label}</span><span style='color:{color};font-size:13px;font-weight:600;'>{value}</span></div>"
        for label, value, color in [
            ("Profit Factor", str(ov['profit_factor']), "#4ADE80" if ov['profit_factor'] >= 1.5 else "#F97316"),
            ("Average Win", f"${ov['average_win']:.2f}", "#4ADE80"),
            ("Average Loss", f"${ov['average_loss']:.2f}", "#F87171"),
            ("Max Drawdown", f"${ov['max_drawdown']:.2f}", "#F97316"),
            ("Rule Compliance", f"{disc['rule_compliance_rate']:.0f}%", "#CBD5E1"),
        ]
      ])}
    </div>

    <!-- Detections -->
    {detection_lines}

    <!-- Tip -->
    <div style="background:#0D3320;border:1px solid #1E6B3A;border-radius:12px;padding:18px;margin-bottom:32px;">
      <p style="color:#4ADE80;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;margin:0 0 8px;">💡 This Week's Focus</p>
      <p style="color:#86EFAC;font-size:14px;margin:0;line-height:1.6;">{tip}</p>
    </div>

    <!-- CTA -->
    <div style="text-align:center;margin-bottom:32px;">
      <a href="{settings.FRONTEND_URL}/dashboard"
        style="display:inline-block;background:#2E86C1;color:white;padding:12px 32px;border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;">
        View Full Dashboard
      </a>
    </div>

    <!-- Footer -->
    <p style="color:#2A4A6B;font-size:12px;text-align:center;margin:0;">
      7 Figure Trading Journal · You're receiving this because you have a Pro account.<br>
      <a href="{settings.FRONTEND_URL}/dashboard/settings" style="color:#2A4A6B;">Manage notifications</a>
    </p>
  </div>
</body>
</html>
"""


def _improvement_tip(disc: dict, ov: dict) -> str:
    if disc["rule_compliance_rate"] < 50:
        return "Your rule compliance dropped below 50% this week. Before each trade, ask yourself: does this setup match my plan exactly? If not, skip it."
    if disc["risk_consistency_rate"] < 60:
        return "Your lot sizes varied significantly this week. Pick one lot size for your current account size and stick to it for the entire next week."
    if disc["emotional_quality_rate"] < 50:
        return "More than half your tagged trades were in negative emotional states. Consider a 15-minute break rule after any losing trade before re-entering the market."
    if ov["profit_factor"] < 1.0:
        return "Your profit factor is below 1.0 — you're losing more than you're making. Focus on cutting losses faster rather than finding more entries."
    if ov["win_rate"] < 40:
        return "Win rate below 40% this week. Review your entry criteria — are you entering on confirmation or anticipation? Wait for confirmation."
    return "Solid week. Keep logging your emotions on every trade — the more data you give the system, the sharper your insights become."


async def send_weekly_report(db: AsyncSession, user: User) -> bool:
    """Send weekly email report to a single user. Returns True if sent."""
    if not user.email_verified or user.plan != "pro":
        return False

    # Get default account
    result = await db.execute(
        select(Account).where(Account.user_id == user.id, Account.is_default == True)
    )
    account = result.scalar_one_or_none()
    if not account:
        result = await db.execute(select(Account).where(Account.user_id == user.id))
        account = result.scalar_one_or_none()
    if not account:
        return False

    # Last 7 days
    now = datetime.now(timezone.utc)
    week_ago = now - timedelta(days=7)

    trades = await get_trades_for_analytics(db, account.id, week_ago, now)
    if not trades:
        return False

    overview = calculate_overview(trades)
    discipline = await calculate_discipline_score(db, account.id, trades)

    # Get unacknowledged detections from this week
    from app.models.detection import BehavioralDetection
    from sqlalchemy import and_
    det_result = await db.execute(
        select(BehavioralDetection).where(
            and_(
                BehavioralDetection.account_id == account.id,
                BehavioralDetection.acknowledged == False,
                BehavioralDetection.detected_at >= week_ago,
            )
        ).order_by(BehavioralDetection.detected_at.desc()).limit(3)
    )
    detections = [{"detection_type": d.detection_type, "detail": d.detail or {}} for d in det_result.scalars().all()]

    period = f"{week_ago.strftime('%d %b')} – {now.strftime('%d %b %Y')}"

    html = _build_weekly_email(
        name=user.display_name,
        data={"overview": overview, "discipline": discipline, "detections": detections, "period": period},
    )

    return await _send_email(
        to_email=user.email,
        subject=f"Your Weekly Trading Report — {now.strftime('%d %b %Y')}",
        html=html,
    )


async def _send_email(to_email: str, subject: str, html: str) -> bool:
    if settings.ENVIRONMENT == "development":
        print(f"\n{'='*60}")
        print(f"WEEKLY REPORT EMAIL → {to_email}")
        print(f"Subject: {subject}")
        print(f"{'='*60}\n")
        return True

    try:
        import sendgrid
        from sendgrid.helpers.mail import Mail
        sg = sendgrid.SendGridAPIClient(api_key=settings.SENDGRID_API_KEY)
        message = Mail(
            from_email="reports@7figurejournal.com",
            to_emails=to_email,
            subject=subject,
            html_content=html,
        )
        sg.send(message)
        return True
    except Exception as e:
        print(f"Weekly report email failed for {to_email}: {e}")
        return False


async def send_weekly_reports_to_all(db: AsyncSession) -> dict:
    """Called by a scheduled job every Sunday. Sends to all Pro users."""
    result = await db.execute(
        select(User).where(
            User.plan == "pro",
            User.email_verified == True,
            User.deleted_at == None,
        )
    )
    users = result.scalars().all()

    sent = 0
    skipped = 0
    for user in users:
        success = await send_weekly_report(db, user)
        if success:
            sent += 1
        else:
            skipped += 1

    return {"sent": sent, "skipped": skipped, "total": len(users)}
