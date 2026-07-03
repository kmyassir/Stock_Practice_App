"""Technical indicator calculations for OHLCV data.

Each function takes a pandas Series or DataFrame (with Open/High/Low/Close/
Volume columns, as returned by yfinance) and returns the calculated series.
"""

import numpy as np
import pandas as pd


def sma(series: pd.Series, period: int) -> pd.Series:
    """Simple moving average."""
    return series.rolling(window=period).mean()


def ema(series: pd.Series, period: int) -> pd.Series:
    """Exponential moving average."""
    return series.ewm(span=period, adjust=False).mean()


def macd(close: pd.Series, fast: int = 12, slow: int = 26, signal: int = 9):
    """MACD line, signal line, and histogram."""
    macd_line = ema(close, fast) - ema(close, slow)
    signal_line = ema(macd_line, signal)
    histogram = macd_line - signal_line
    return macd_line, signal_line, histogram


def parabolic_sar(
    df: pd.DataFrame,
    af_start: float = 0.02,
    af_step: float = 0.02,
    af_max: float = 0.2,
) -> pd.Series:
    """Wilder's Parabolic SAR. Expects High, Low, Close columns."""
    high = df["High"].to_numpy()
    low = df["Low"].to_numpy()
    n = len(df)

    sar = np.zeros(n)
    trend = np.zeros(n)  # 1 = uptrend, -1 = downtrend
    ep = np.zeros(n)
    af = np.zeros(n)

    trend[0] = 1
    sar[0] = low[0]
    ep[0] = high[0]
    af[0] = af_start

    for i in range(1, n):
        prev_sar, prev_ep, prev_af, prev_trend = sar[i - 1], ep[i - 1], af[i - 1], trend[i - 1]
        candidate_sar = prev_sar + prev_af * (prev_ep - prev_sar)

        if prev_trend == 1:
            floor = min(low[i - 1], low[i - 2]) if i >= 2 else low[i - 1]
            candidate_sar = min(candidate_sar, floor)

            if low[i] < candidate_sar:
                trend[i] = -1
                sar[i] = prev_ep
                ep[i] = low[i]
                af[i] = af_start
            else:
                trend[i] = 1
                sar[i] = candidate_sar
                if high[i] > prev_ep:
                    ep[i] = high[i]
                    af[i] = min(prev_af + af_step, af_max)
                else:
                    ep[i] = prev_ep
                    af[i] = prev_af
        else:
            ceiling = max(high[i - 1], high[i - 2]) if i >= 2 else high[i - 1]
            candidate_sar = max(candidate_sar, ceiling)

            if high[i] > candidate_sar:
                trend[i] = 1
                sar[i] = prev_ep
                ep[i] = high[i]
                af[i] = af_start
            else:
                trend[i] = -1
                sar[i] = candidate_sar
                if low[i] < prev_ep:
                    ep[i] = low[i]
                    af[i] = min(prev_af + af_step, af_max)
                else:
                    ep[i] = prev_ep
                    af[i] = prev_af

    return pd.Series(sar, index=df.index, name="PSAR")


def efi(df: pd.DataFrame, period: int = 13) -> pd.Series:
    """Elder Force Index: (close - prev close) * volume, smoothed with an EMA."""
    raw_force = (df["Close"] - df["Close"].shift(1)) * df["Volume"]
    return ema(raw_force, period)
