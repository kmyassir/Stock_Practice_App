"""Fetch 5 years of daily OHLCV for the full NSE stock universe."""

import json
import time
from pathlib import Path

import pandas as pd
import yfinance as yf

DATA_DIR = Path(__file__).parent
UNIVERSE_PATH = DATA_DIR / "stock_universe.json"
OHLCV_DIR = DATA_DIR / "ohlcv"
HISTORY_PERIOD = "5y"


def load_tickers() -> list[str]:
    return json.loads(UNIVERSE_PATH.read_text())


def fetch_ohlcv(ticker: str) -> pd.DataFrame:
    df = yf.Ticker(ticker).history(period=HISTORY_PERIOD, interval="1d")
    return df[["Open", "High", "Low", "Close", "Volume"]]


def save_ohlcv(ticker: str, df: pd.DataFrame) -> None:
    OHLCV_DIR.mkdir(parents=True, exist_ok=True)
    records = json.loads(df.reset_index().to_json(orient="records", date_format="iso"))
    (OHLCV_DIR / f"{ticker}.json").write_text(json.dumps(records, indent=2))


def main() -> None:
    tickers = load_tickers()
    print(f"Fetching OHLCV for {len(tickers)} tickers...")

    saved = 0
    for i, ticker in enumerate(tickers, start=1):
        try:
            df = fetch_ohlcv(ticker)
            if df.empty:
                print(f"Skipping {ticker}: no data returned")
            else:
                save_ohlcv(ticker, df)
                saved += 1
        except Exception as exc:
            print(f"Skipping {ticker}: {exc}")

        if i % 50 == 0:
            print(f"Processed {i}/{len(tickers)} tickers, {saved} saved so far")

        time.sleep(0.2)  # be polite to avoid rate limiting

    print(f"Done. Saved OHLCV for {saved}/{len(tickers)} tickers to {OHLCV_DIR}")


if __name__ == "__main__":
    main()
