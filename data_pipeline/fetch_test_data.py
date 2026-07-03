"""Fetch OHLCV data for a sample of tickers and sanity-check the indicators."""

import json
from pathlib import Path

import pandas as pd
import yfinance as yf

from indicators import ema, macd, parabolic_sar, sma, efi

DATA_DIR = Path(__file__).parent
UNIVERSE_PATH = DATA_DIR / "stock_universe.json"
OHLCV_DIR = DATA_DIR / "ohlcv"
SAMPLE_SIZE = 10
HISTORY_PERIOD = "5y"


def load_sample_tickers(n: int = SAMPLE_SIZE) -> list[str]:
    tickers = json.loads(UNIVERSE_PATH.read_text())
    return tickers[:n]


def fetch_ohlcv(ticker: str) -> pd.DataFrame:
    df = yf.Ticker(ticker).history(period=HISTORY_PERIOD, interval="1d")
    return df[["Open", "High", "Low", "Close", "Volume"]]


def save_ohlcv(ticker: str, df: pd.DataFrame) -> None:
    OHLCV_DIR.mkdir(parents=True, exist_ok=True)
    records = json.loads(df.reset_index().to_json(orient="records", date_format="iso"))
    (OHLCV_DIR / f"{ticker}.json").write_text(json.dumps(records, indent=2))


def main() -> None:
    tickers = load_sample_tickers()
    print(f"Fetching {len(tickers)} tickers: {tickers}")

    summary_rows = []

    for ticker in tickers:
        try:
            df = fetch_ohlcv(ticker)
            if df.empty:
                print(f"Skipping {ticker}: no data returned")
                continue

            save_ohlcv(ticker, df)

            # Sanity-check run with default parameters; results aren't kept.
            sma(df["Close"], 20)
            ema(df["Close"], 20)
            macd_line, _signal_line, _hist = macd(df["Close"])
            sar = parabolic_sar(df)
            efi(df)

            summary_rows.append(
                {
                    "ticker": ticker,
                    "close": round(df["Close"].iloc[-1], 2),
                    "macd": round(macd_line.iloc[-1], 2),
                    "psar": round(sar.iloc[-1], 2),
                }
            )
        except Exception as exc:
            print(f"Skipping {ticker}: {exc}")

    print(f"\n{'Ticker':<15}{'Close':>12}{'MACD':>12}{'PSAR':>12}")
    for row in summary_rows:
        print(f"{row['ticker']:<15}{row['close']:>12}{row['macd']:>12}{row['psar']:>12}")


if __name__ == "__main__":
    main()
