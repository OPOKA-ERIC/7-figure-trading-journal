import pandas as pd
import io
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.trade import Trade


COLUMN_ALIASES = {
    # Time / open time
    "time": "open_time",
    "open time": "open_time",
    "open_time": "open_time",

    # Close time
    "time.1": "close_time",
    "close time": "close_time",
    "close_time": "close_time",

    # Type / direction
    "type": "direction",
    "direction": "direction",

    # Volume / lot size
    "volume": "lot_size",
    "size": "lot_size",
    "lot_size": "lot_size",
    "lots": "lot_size",

    # Symbol
    "symbol": "symbol",
    "item": "symbol",

    # Prices
    "price": "open_price",
    "open price": "open_price",
    "open_price": "open_price",
    "price.1": "close_price",
    "close price": "close_price",
    "close_price": "close_price",

    # P&L
    "profit": "profit_loss",
    "profit_loss": "profit_loss",
    "p&l": "profit_loss",
    "pnl": "profit_loss",

    # Commission / swap
    "commission": "commission",
    "swap": "swap",

    # Ticket
    "ticket": "mt5_ticket",
    "order": "mt5_ticket",
    "deal": "mt5_ticket",
    "position": "mt5_ticket",
}


def normalize_direction(val: str) -> Optional[str]:
    if not val:
        return None
    val = str(val).lower().strip()
    if val in ("buy", "buy limit", "buy stop", "buy stop limit"):
        return "buy"
    if val in ("sell", "sell limit", "sell stop", "sell stop limit"):
        return "sell"
    return None


def safe_decimal(val) -> Optional[Decimal]:
    try:
        return Decimal(str(val)).quantize(Decimal("0.00001"))
    except (InvalidOperation, TypeError, ValueError):
        return None


def safe_datetime(val) -> Optional[datetime]:
    if pd.isna(val):
        return None
    try:
        if isinstance(val, datetime):
            return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
        return pd.to_datetime(val, utc=True).to_pydatetime()
    except Exception:
        return None


def parse_mt5_file(content: bytes, filename: str) -> tuple[list[dict], list[str]]:
    """
    Parse an MT5 HTML or CSV export file.
    Returns (rows, errors) where rows is a list of clean trade dicts.
    """
    errors = []
    rows = []

    try:
        if filename.lower().endswith(".html") or filename.lower().endswith(".htm"):
            # MT5 HTML report — try UTF-16 first, then UTF-8
            for encoding in ("utf-16", "utf-8", "latin-1"):
                try:
                    text = content.decode(encoding)
                    tables = pd.read_html(io.StringIO(text))
                    break
                except (UnicodeDecodeError, ValueError):
                    continue
            else:
                return [], ["Could not decode file. Make sure it is an MT5 HTML report."]

            # Find the deals/orders table — it has the most columns
            df = max(tables, key=lambda t: len(t.columns))

        elif filename.lower().endswith(".csv"):
            for encoding in ("utf-8", "utf-16", "latin-1"):
                try:
                    df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                    break
                except (UnicodeDecodeError, pd.errors.ParserError):
                    continue
            else:
                return [], ["Could not decode CSV file."]
        else:
            return [], ["Unsupported file type. Please upload an MT5 HTML report or CSV file."]

    except Exception as e:
        return [], [f"Failed to parse file: {str(e)}"]

    # Normalize column names
    df.columns = [str(c).lower().strip() for c in df.columns]
    df = df.rename(columns=COLUMN_ALIASES)

    # Drop rows where direction is not buy/sell (summaries, headers, etc.)
    if "direction" not in df.columns:
        return [], ["Could not find trade type/direction column. Is this an MT5 report?"]

    df["direction"] = df["direction"].apply(normalize_direction)
    df = df[df["direction"].notna()].copy()

    if df.empty:
        return [], ["No buy/sell trades found in this file."]

    # Process each row
    for idx, row in df.iterrows():
        try:
            open_time = safe_datetime(row.get("open_time"))
            close_time = safe_datetime(row.get("close_time"))
            open_price = safe_decimal(row.get("open_price"))
            close_price = safe_decimal(row.get("close_price"))
            lot_size = safe_decimal(row.get("lot_size"))
            profit_loss = safe_decimal(row.get("profit_loss"))
            symbol = str(row.get("symbol", "")).strip().upper()

            # Validate required fields
            missing = []
            if not open_time:
                missing.append("open_time")
            if not close_time:
                missing.append("close_time")
            if not open_price:
                missing.append("open_price")
            if not close_price:
                missing.append("close_price")
            if not lot_size:
                missing.append("lot_size")
            if profit_loss is None:
                missing.append("profit_loss")
            if not symbol:
                missing.append("symbol")

            if missing:
                errors.append(f"Row {idx}: missing {', '.join(missing)} — skipped")
                continue

            # Calculate duration
            duration_seconds = None
            if open_time and close_time:
                duration_seconds = int((close_time - open_time).total_seconds())

            trade = {
                "symbol": symbol,
                "direction": row["direction"],
                "open_time": open_time,
                "close_time": close_time,
                "open_price": open_price,
                "close_price": close_price,
                "lot_size": lot_size,
                "profit_loss": profit_loss,
                "commission": safe_decimal(row.get("commission")) or Decimal("0"),
                "swap": safe_decimal(row.get("swap")) or Decimal("0"),
                "duration_seconds": duration_seconds,
                "mt5_ticket": int(row["mt5_ticket"]) if "mt5_ticket" in row and not pd.isna(row.get("mt5_ticket", float("nan"))) else None,
            }
            rows.append(trade)

        except Exception as e:
            errors.append(f"Row {idx}: unexpected error — {str(e)}")

    return rows, errors


async def import_trades(
    db: AsyncSession,
    account_id: str,
    rows: list[dict],
) -> dict:
    """
    Insert parsed trades into DB, skipping duplicates by mt5_ticket.
    Returns import summary.
    """
    imported = 0
    skipped = 0

    # Fetch existing tickets for this account to check duplicates
    existing_result = await db.execute(
        select(Trade.mt5_ticket).where(
            Trade.account_id == account_id,
            Trade.mt5_ticket != None,
        )
    )
    existing_tickets = {row[0] for row in existing_result.fetchall()}

    for row in rows:
        ticket = row.get("mt5_ticket")

        # Skip duplicate
        if ticket and ticket in existing_tickets:
            skipped += 1
            continue

        trade = Trade(
            account_id=account_id,
            **row,
        )
        db.add(trade)

        if ticket:
            existing_tickets.add(ticket)

        imported += 1

    await db.commit()
    return {"imported": imported, "skipped_duplicates": skipped}