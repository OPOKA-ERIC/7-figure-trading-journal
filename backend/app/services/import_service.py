import io
import re
import json
import pandas as pd
from bs4 import BeautifulSoup
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.models.trade import Trade


def normalize_direction(val) -> Optional[str]:
    if not val or str(val).strip() in ("", "nan"):
        return None
    val = str(val).lower().strip()
    if val in ("buy", "buy limit", "buy stop", "buy stop limit", "in"):
        return "buy"
    if val in ("sell", "sell limit", "sell stop", "sell stop limit", "out"):
        return "sell"
    return None


def safe_decimal(val) -> Optional[Decimal]:
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    try:
        cleaned = str(val).replace(" ", "").replace(",", "").strip()
        if cleaned in ("", "nan", "-"):
            return None
        return Decimal(cleaned).quantize(Decimal("0.00001"))
    except (InvalidOperation, TypeError, ValueError):
        return None


def safe_datetime(val) -> Optional[datetime]:
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    try:
        if isinstance(val, datetime):
            return val.replace(tzinfo=timezone.utc) if val.tzinfo is None else val
        s = str(val).strip()
        if not s or s == "nan":
            return None
        # MT5 format: 2026.01.05 13:03:56
        for fmt in ("%Y.%m.%d %H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y.%m.%d %H:%M"):
            try:
                return datetime.strptime(s, fmt).replace(tzinfo=timezone.utc)
            except ValueError:
                continue
        return pd.to_datetime(s, utc=True).to_pydatetime()
    except Exception:
        return None


def _decode_content(content: bytes) -> Optional[str]:
    for encoding in ("utf-16", "utf-16-le", "utf-16-be", "utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = content.decode(encoding)
            if "<html" in text.lower() or "<table" in text.lower():
                print(f"[IMPORT] decoded with encoding={encoding}")
                return text
        except (UnicodeDecodeError, UnicodeError):
            continue
    return None


def _parse_positions_section(df: pd.DataFrame) -> list[dict]:
    """
    MT5 HTML reports use merged cells that span multiple columns.
    We find the actual column offsets by looking at the header row
    and mapping non-nan values to their positions.
    """
    trades = []
    in_positions = False
    found_header = False
    col_map = {}  # field_name -> column index

    for i, row in df.iterrows():
        vals = list(row.values)
        str_vals = [str(v).strip() for v in vals]
        non_empty = [v for v in str_vals if v not in ("", "nan")]

        if not non_empty:
            continue

        # Detect Positions section title
        if non_empty[0] == "Positions" and len(set(non_empty)) == 1:
            in_positions = True
            continue

        # Detect column header row and build col_map
        if in_positions and not found_header:
            if "Time" in str_vals and "Symbol" in str_vals:
                found_header = True
                # Build map: field -> first column index where this header appears
                seen = {}
                for ci, v in enumerate(str_vals):
                    if v in ("", "nan"):
                        continue
                    key = v.lower().strip()
                    if key not in seen:
                        seen[key] = ci
                    else:
                        # Second occurrence of same header (e.g. Time, Price)
                        seen[key + "_2"] = ci

                col_map = {
                    "open_time":   seen.get("time", seen.get("open time", 0)),
                    "position":    seen.get("position", 1),
                    "symbol":      seen.get("symbol", 2),
                    "type":        seen.get("type", 3),
                    "volume":      12,
                    "open_price":  13,
                    "sl":          14,
                    "tp":          15,
                    "close_time":  16,
                    "close_price": 17,
                    "commission":  18,
                    "swap":        19,
                    "profit":      20,
                }
                print(f"[IMPORT] col_map: {col_map}")
                continue

        # Stop at next section
        if in_positions and found_header:
            if non_empty[0] in ("Orders", "Deals", "Open Positions", "Results", "Balance:") or \
               "Net Profit" in non_empty[0] or "Profit Factor" in non_empty[0]:
                break

            if len(non_empty) < 5:
                continue

            def get_col(field):
                idx = col_map.get(field, -1)
                if idx < 0 or idx >= len(vals):
                    return None
                v = vals[idx]
                return None if str(v).strip() in ("", "nan") else v

            if not trades:
                print(f"[IMPORT] first data row all values: {[(ci, repr(v)) for ci, v in enumerate(vals) if str(v).strip() not in ('', 'nan')]}")

            trades.append({
                "open_time":   get_col("open_time"),
                "position":    get_col("position"),
                "symbol":      get_col("symbol"),
                "type":        get_col("type"),
                "volume":      get_col("volume"),
                "open_price":  get_col("open_price"),
                "close_time":  get_col("close_time"),
                "close_price": get_col("close_price"),
                "commission":  get_col("commission"),
                "swap":        get_col("swap"),
                "profit":      get_col("profit"),
            })

    print(f"[IMPORT] extracted {len(trades)} raw rows from Positions section")
    if trades:
        print(f"[IMPORT] first raw row: {trades[0]}")
    return trades


def _map_positions_row(row: dict) -> Optional[dict]:
    """Map a positional Positions row to our trade schema."""
    open_time  = safe_datetime(row.get("open_time"))
    close_time = safe_datetime(row.get("close_time"))
    open_price = safe_decimal(row.get("open_price"))
    close_price = safe_decimal(row.get("close_price"))
    symbol     = str(row.get("symbol", "")).strip().upper()
    direction  = normalize_direction(row.get("type"))
    profit_loss = safe_decimal(row.get("profit"))
    commission  = safe_decimal(row.get("commission")) or Decimal("0")
    swap        = safe_decimal(row.get("swap")) or Decimal("0")
    position_id = row.get("position")

    # Volume: handle "0.01 / 0.01" format
    vol_raw = str(row.get("volume", "")).split("/")[0].strip()
    lot_size = safe_decimal(vol_raw)

    return {
        "open_time":   open_time,
        "close_time":  close_time,
        "open_price":  open_price,
        "close_price": close_price,
        "lot_size":    lot_size,
        "direction":   direction,
        "symbol":      symbol,
        "profit_loss": profit_loss,
        "commission":  commission,
        "swap":        swap,
        "position_id": str(position_id).strip() if position_id and str(position_id) != "nan" else None,
    }


def _parse_mt5_html(text: str) -> tuple[list[dict], list[str]]:
    """Parse MT5 HTML report. Returns (trade_rows, errors)."""
    errors = []
    rows = []

    # Try pandas first to get the full table
    df = None
    try:
        tables = pd.read_html(io.StringIO(text), flavor="lxml", header=None)
        if tables:
            df = max(tables, key=lambda t: len(t.columns))
            print(f"[IMPORT] pandas found {len(tables)} tables, largest has {len(df.columns)} cols, {len(df)} rows")
    except Exception as e:
        print(f"[IMPORT] pandas failed: {e}")

    if df is None:
        return [], ["Could not parse HTML tables from this file."]

    # Extract positions section
    raw_rows = _parse_positions_section(df)

    if not raw_rows:
        return [], ["No Positions section found. Make sure this is an MT5 Account History report with closed trades."]

    for i, raw in enumerate(raw_rows):
        mapped = _map_positions_row(raw)
        if not mapped:
            continue

        missing = []
        if not mapped["open_time"]: missing.append("open_time")
        if not mapped["close_time"]: missing.append("close_time")
        if not mapped["open_price"]: missing.append("open_price")
        if not mapped["close_price"]: missing.append("close_price")
        if not mapped["lot_size"]: missing.append("lot_size")
        if mapped["profit_loss"] is None: missing.append("profit_loss")
        if not mapped["symbol"]: missing.append("symbol")
        if not mapped["direction"]: missing.append("direction")

        if missing:
            errors.append(f"Row {i}: missing {', '.join(missing)} — skipped")
            continue

        duration_seconds = None
        if mapped["open_time"] and mapped["close_time"]:
            duration_seconds = int((mapped["close_time"] - mapped["open_time"]).total_seconds())

        # Use position_id as mt5_ticket
        mt5_ticket = None
        try:
            if mapped["position_id"]:
                mt5_ticket = int(float(mapped["position_id"]))
        except (ValueError, TypeError):
            pass

        rows.append({
            "symbol": mapped["symbol"],
            "direction": mapped["direction"],
            "open_time": mapped["open_time"],
            "close_time": mapped["close_time"],
            "open_price": mapped["open_price"],
            "close_price": mapped["close_price"],
            "lot_size": mapped["lot_size"],
            "profit_loss": mapped["profit_loss"],
            "commission": mapped["commission"],
            "swap": mapped["swap"],
            "duration_seconds": duration_seconds,
            "mt5_ticket": mt5_ticket,
        })

    print(f"[IMPORT] final: {len(rows)} valid trades, {len(errors)} skipped rows")
    return rows, errors


def parse_mt5_file(content: bytes, filename: str) -> tuple[list[dict], list[str]]:
    if filename.lower().endswith((".html", ".htm")):
        text = _decode_content(content)
        if text is None:
            return [], ["Could not decode file. Make sure it is an MT5 HTML report."]
        return _parse_mt5_html(text)

    elif filename.lower().endswith(".csv"):
        for encoding in ("utf-8", "utf-16", "latin-1"):
            try:
                df = pd.read_csv(io.BytesIO(content), encoding=encoding)
                break
            except (UnicodeDecodeError, pd.errors.ParserError):
                continue
        else:
            return [], ["Could not decode CSV file."]

        df.columns = [str(c).lower().strip() for c in df.columns]
        if "type" not in df.columns and "direction" not in df.columns:
            return [], [f"Could not find direction column. Columns: {list(df.columns)}"]

        rows = []
        errors = []
        for idx, row in df.iterrows():
            direction = normalize_direction(row.get("type") or row.get("direction"))
            if not direction:
                continue
            open_time = safe_datetime(row.get("open time") or row.get("time"))
            close_time = safe_datetime(row.get("close time") or row.get("time.1"))
            open_price = safe_decimal(row.get("price") or row.get("open price"))
            close_price = safe_decimal(row.get("price.1") or row.get("close price"))
            lot_size = safe_decimal(str(row.get("volume", "")).split("/")[0])
            profit_loss = safe_decimal(row.get("profit"))
            symbol = str(row.get("symbol", "")).strip().upper()

            if not all([open_time, close_time, open_price, close_price, lot_size, profit_loss is not None, symbol]):
                errors.append(f"Row {idx}: incomplete data — skipped")
                continue

            rows.append({
                "symbol": symbol,
                "direction": direction,
                "open_time": open_time,
                "close_time": close_time,
                "open_price": open_price,
                "close_price": close_price,
                "lot_size": lot_size,
                "profit_loss": profit_loss,
                "commission": safe_decimal(row.get("commission")) or Decimal("0"),
                "swap": safe_decimal(row.get("swap")) or Decimal("0"),
                "duration_seconds": int((close_time - open_time).total_seconds()) if open_time and close_time else None,
                "mt5_ticket": None,
            })
        return rows, errors

    else:
        return [], ["Unsupported file type. Please upload an MT5 HTML or CSV file."]


async def import_trades(db: AsyncSession, account_id: str, rows: list[dict]) -> dict:
    imported = 0
    skipped = 0

    existing_result = await db.execute(
        select(Trade.mt5_ticket).where(
            Trade.account_id == account_id,
            Trade.mt5_ticket != None,
        )
    )
    existing_tickets = {row[0] for row in existing_result.fetchall()}

    for row in rows:
        ticket = row.get("mt5_ticket")
        if ticket and ticket in existing_tickets:
            skipped += 1
            continue

        trade = Trade(account_id=account_id, **row)
        db.add(trade)
        if ticket:
            existing_tickets.add(ticket)
        imported += 1

    await db.commit()
    return {"imported": imported, "skipped_duplicates": skipped}
