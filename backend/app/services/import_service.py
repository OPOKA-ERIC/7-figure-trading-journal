import io
import pandas as pd
from bs4 import BeautifulSoup
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


def normalize_direction(val) -> Optional[str]:
    if not val or str(val).strip() == "":
        return None
    val = str(val).lower().strip()
    if val in ("buy", "buy limit", "buy stop", "buy stop limit"):
        return "buy"
    if val in ("sell", "sell limit", "sell stop", "sell stop limit"):
        return "sell"
    return None


def safe_decimal(val) -> Optional[Decimal]:
    try:
        if pd.isna(val):
            return None
    except Exception:
        pass
    try:
        cleaned = str(val).replace(" ", "").replace(",", "")
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
        return pd.to_datetime(val, utc=True).to_pydatetime()
    except Exception:
        return None


def _decode_content(content: bytes) -> Optional[str]:
    """Try multiple encodings and return the first that produces valid HTML."""
    for encoding in ("utf-16", "utf-16-le", "utf-16-be", "utf-8-sig", "utf-8", "latin-1", "cp1252"):
        try:
            text = content.decode(encoding)
            if "<html" in text.lower() or "<table" in text.lower():
                print(f"[IMPORT] decoded with encoding={encoding}")
                return text
        except (UnicodeDecodeError, UnicodeError):
            continue
    return None


def _parse_html_with_beautifulsoup(text: str) -> Optional[pd.DataFrame]:
    """
    Parse MT5 HTML report using BeautifulSoup directly.
    MT5 Exness reports have nested tables — find the one with trade data.
    """
    soup = BeautifulSoup(text, "lxml")
    tables = soup.find_all("table")
    print(f"[IMPORT] BeautifulSoup found {len(tables)} tables")

    best_df = None
    best_cols = 0

    for i, table in enumerate(tables):
        try:
            rows = table.find_all("tr")
            if len(rows) < 2:
                continue

            # Get headers from first row
            headers = []
            header_row = rows[0]
            for th in header_row.find_all(["th", "td"]):
                headers.append(th.get_text(strip=True))

            if not headers:
                continue

            # Get data rows
            data = []
            for row in rows[1:]:
                cells = row.find_all(["td", "th"])
                if cells:
                    data.append([c.get_text(strip=True) for c in cells])

            if not data:
                continue

            # Pad rows to match header length
            max_len = max(len(headers), max(len(r) for r in data))
            while len(headers) < max_len:
                headers.append(f"col_{len(headers)}")
            data = [r + [""] * (max_len - len(r)) for r in data]

            df = pd.DataFrame(data, columns=headers)
            print(f"[IMPORT] table {i}: {len(df)} rows, columns: {list(df.columns)}")

            if len(df.columns) > best_cols:
                best_cols = len(df.columns)
                best_df = df

        except Exception as e:
            print(f"[IMPORT] table {i} parse error: {e}")
            continue

    return best_df


def parse_mt5_file(content: bytes, filename: str) -> tuple[list[dict], list[str]]:
    errors = []
    rows = []

    try:
        if filename.lower().endswith((".html", ".htm")):
            text = _decode_content(content)
            if text is None:
                return [], ["Could not decode file. Make sure it is an MT5 HTML report saved from MetaTrader 5."]

            # Try pandas first, fall back to BeautifulSoup
            df = None
            try:
                tables = pd.read_html(io.StringIO(text), flavor="lxml")
                if tables:
                    df = max(tables, key=lambda t: len(t.columns))
                    print(f"[IMPORT] pandas found {len(tables)} tables, using one with {len(df.columns)} cols: {list(df.columns)}")
            except Exception as e:
                print(f"[IMPORT] pandas failed: {e}, trying BeautifulSoup")

            if df is None or len(df.columns) < 3:
                df = _parse_html_with_beautifulsoup(text)

            if df is None:
                return [], ["No trade tables found in this file. Make sure this is an MT5 Account History report."]

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
    print(f"[IMPORT] normalized columns: {list(df.columns)}")
    df = df.rename(columns=COLUMN_ALIASES)
    print(f"[IMPORT] after alias mapping: {list(df.columns)}")

    # Need direction column
    if "direction" not in df.columns:
        return [], [f"Could not find trade direction column. Columns found: {list(df.columns)}"]

    df["direction"] = df["direction"].apply(normalize_direction)
    df = df[df["direction"].notna()].copy()

    if df.empty:
        return [], ["No buy/sell trades found in this file. Make sure you exported Account History (not open positions)."]

    print(f"[IMPORT] {len(df)} buy/sell rows after filtering")

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

            missing = []
            if not open_time: missing.append("open_time")
            if not close_time: missing.append("close_time")
            if not open_price: missing.append("open_price")
            if not close_price: missing.append("close_price")
            if not lot_size: missing.append("lot_size")
            if profit_loss is None: missing.append("profit_loss")
            if not symbol: missing.append("symbol")

            if missing:
                errors.append(f"Row {idx}: missing {', '.join(missing)} — skipped")
                continue

            duration_seconds = None
            if open_time and close_time:
                duration_seconds = int((close_time - open_time).total_seconds())

            ticket_val = row.get("mt5_ticket")
            mt5_ticket = None
            try:
                if ticket_val and str(ticket_val).strip() not in ("", "nan"):
                    mt5_ticket = int(float(str(ticket_val)))
            except (ValueError, TypeError):
                pass

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
                "mt5_ticket": mt5_ticket,
            }
            rows.append(trade)

        except Exception as e:
            errors.append(f"Row {idx}: unexpected error — {str(e)}")

    print(f"[IMPORT] final: {len(rows)} valid trades, {len(errors)} errors")
    return rows, errors


async def import_trades(
    db: AsyncSession,
    account_id: str,
    rows: list[dict],
) -> dict:
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
