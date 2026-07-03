"""
Build a universe of liquid NSE equities filtered by market cap.

Downloads the full NSE equity list, checks each symbol's market cap via
yfinance, and saves tickers with market cap above Rs 1000 crore to
data_pipeline/stock_universe.json.
"""

import json
import time
from io import StringIO
from pathlib import Path

import pandas as pd
import requests
import yfinance as yf

NSE_EQUITY_LIST_URL = "https://archives.nseindia.com/content/equities/EQUITY_L.csv"
MARKET_CAP_THRESHOLD = 1000 * 1e7  # Rs 1000 crore
OUTPUT_PATH = Path(__file__).parent / "stock_universe.json"

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
        "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/csv,application/csv,text/plain,*/*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.nseindia.com/market-data/securities-available-for-trading",
}


def fetch_nse_symbols() -> list[str]:
    """Download the NSE equity list and return the list of trading symbols."""
    session = requests.Session()
    # NSE requires a session cookie from the main site before archives will respond.
    session.get("https://www.nseindia.com", headers=HEADERS, timeout=10)
    response = session.get(NSE_EQUITY_LIST_URL, headers=HEADERS, timeout=10)
    response.raise_for_status()

    df = pd.read_csv(StringIO(response.text))
    df.columns = [c.strip() for c in df.columns]
    return df["SYMBOL"].dropna().astype(str).str.strip().tolist()


def get_market_cap(ticker: str) -> float | None:
    """Return market cap for a ticker, or None if unavailable."""
    stock = yf.Ticker(ticker)
    try:
        market_cap = stock.fast_info.get("market_cap")
    except Exception:
        market_cap = None

    if not market_cap:
        try:
            market_cap = stock.info.get("marketCap")
        except Exception:
            market_cap = None

    return market_cap


def build_stock_universe(symbols: list[str]) -> list[str]:
    """Filter symbols down to those with market cap above the threshold."""
    universe = []

    for i, symbol in enumerate(symbols, start=1):
        ticker = f"{symbol}.NS"
        try:
            market_cap = get_market_cap(ticker)
            if market_cap and market_cap > MARKET_CAP_THRESHOLD:
                universe.append(ticker)
        except Exception as exc:
            print(f"Skipping {ticker}: {exc}")

        if i % 50 == 0:
            print(f"Processed {i}/{len(symbols)} symbols, {len(universe)} kept so far")

        time.sleep(0.2)  # be polite to avoid rate limiting

    return universe


def main() -> None:
    print("Fetching NSE equity list...")
    symbols = fetch_nse_symbols()
    print(f"Found {len(symbols)} symbols. Checking market caps...")

    universe = build_stock_universe(symbols)

    OUTPUT_PATH.write_text(json.dumps(universe, indent=2))
    print(f"Saved {len(universe)} stocks to {OUTPUT_PATH}")


if __name__ == "__main__":
    main()
