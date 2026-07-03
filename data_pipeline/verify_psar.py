"""Print PSAR values and trend direction for ABB.NS's last 10 candles.

Used to sanity-check the TypeScript port of parabolic_sar in
stock-chart-app/app/lib/indicators.ts against this Python implementation.
"""

import json
from pathlib import Path

import pandas as pd

from indicators import parabolic_sar

DATA_DIR = Path(__file__).parent
OHLCV_PATH = DATA_DIR / "ohlcv" / "ABB.NS.json"


def main() -> None:
    payload = json.loads(OHLCV_PATH.read_text())
    df = pd.DataFrame(
        {
            "High": payload["high"],
            "Low": payload["low"],
            "Close": payload["close"],
        },
        index=payload["dates"],
    )

    sar = parabolic_sar(df)

    print(f"{'Date':<12}{'Close':>10}{'PSAR':>10}  Trend")
    for date, close, sar_value in zip(df.index[-10:], df["Close"].tail(10), sar.tail(10)):
        trend = "up" if close > sar_value else "down"
        print(f"{date:<12}{close:>10.2f}{sar_value:>10.2f}  {trend}")


if __name__ == "__main__":
    main()
