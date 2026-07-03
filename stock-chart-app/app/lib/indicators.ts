export function sma(closes: number[], period: number): (number | null)[] {
  return closes.map((_, i) => {
    if (i < period - 1) return null;
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) sum += closes[j];
    return sum / period;
  });
}

export function ema(closes: number[], period: number): (number | null)[] {
  const result: (number | null)[] = new Array(closes.length).fill(null);
  if (closes.length < period) return result;

  const multiplier = 2 / (period + 1);

  let seed = 0;
  for (let j = 0; j < period; j++) seed += closes[j];
  seed /= period;
  result[period - 1] = seed;

  for (let i = period; i < closes.length; i++) {
    const prev = result[i - 1] as number;
    result[i] = (closes[i] - prev) * multiplier + prev;
  }

  return result;
}

export function macd(
  closes: number[],
  fast = 12,
  slow = 26,
  signal = 9
): {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
} {
  const fastEma = ema(closes, fast);
  const slowEma = ema(closes, slow);

  const macdLine: (number | null)[] = closes.map((_, i) => {
    const f = fastEma[i];
    const s = slowEma[i];
    return f !== null && s !== null ? f - s : null;
  });

  const signalLine: (number | null)[] = new Array(closes.length).fill(null);
  const firstValidIndex = macdLine.findIndex((v) => v !== null);

  if (firstValidIndex !== -1) {
    const macdValues = macdLine.slice(firstValidIndex) as number[];
    const signalOnValid = ema(macdValues, signal);
    signalOnValid.forEach((v, i) => {
      signalLine[firstValidIndex + i] = v;
    });
  }

  const histogram: (number | null)[] = closes.map((_, i) => {
    const m = macdLine[i];
    const s = signalLine[i];
    return m !== null && s !== null ? m - s : null;
  });

  return { macdLine, signalLine, histogram };
}

export function efi(closes: number[], volumes: number[], period = 13): (number | null)[] {
  const n = closes.length;
  const rawForce: (number | null)[] = new Array(n).fill(null);
  for (let i = 1; i < n; i++) {
    rawForce[i] = (closes[i] - closes[i - 1]) * volumes[i];
  }

  const result: (number | null)[] = new Array(n).fill(null);
  const firstValidIndex = rawForce.findIndex((v) => v !== null);

  if (firstValidIndex !== -1) {
    const values = rawForce.slice(firstValidIndex) as number[];
    const emaOnValid = ema(values, period);
    emaOnValid.forEach((v, i) => {
      result[firstValidIndex + i] = v;
    });
  }

  return result;
}

export interface PsarPoint {
  value: number;
  isUptrend: boolean;
}

export function parabolicSar(
  highs: number[],
  lows: number[],
  afStart = 0.02,
  afStep = 0.02,
  afMax = 0.2
): PsarPoint[] {
  const n = highs.length;
  const sar = new Array<number>(n).fill(0);
  const trend = new Array<number>(n).fill(0); // 1 = uptrend, -1 = downtrend
  const ep = new Array<number>(n).fill(0);
  const af = new Array<number>(n).fill(0);

  trend[0] = 1;
  sar[0] = lows[0];
  ep[0] = highs[0];
  af[0] = afStart;

  for (let i = 1; i < n; i++) {
    const prevSar = sar[i - 1];
    const prevEp = ep[i - 1];
    const prevAf = af[i - 1];
    const prevTrend = trend[i - 1];

    let candidateSar = prevSar + prevAf * (prevEp - prevSar);

    if (prevTrend === 1) {
      const floor = i >= 2 ? Math.min(lows[i - 1], lows[i - 2]) : lows[i - 1];
      candidateSar = Math.min(candidateSar, floor);

      if (lows[i] < candidateSar) {
        trend[i] = -1;
        sar[i] = prevEp;
        ep[i] = lows[i];
        af[i] = afStart;
      } else {
        trend[i] = 1;
        sar[i] = candidateSar;
        if (highs[i] > prevEp) {
          ep[i] = highs[i];
          af[i] = Math.min(prevAf + afStep, afMax);
        } else {
          ep[i] = prevEp;
          af[i] = prevAf;
        }
      }
    } else {
      const ceiling = i >= 2 ? Math.max(highs[i - 1], highs[i - 2]) : highs[i - 1];
      candidateSar = Math.max(candidateSar, ceiling);

      if (highs[i] > candidateSar) {
        trend[i] = 1;
        sar[i] = prevEp;
        ep[i] = highs[i];
        af[i] = afStart;
      } else {
        trend[i] = -1;
        sar[i] = candidateSar;
        if (lows[i] < prevEp) {
          ep[i] = lows[i];
          af[i] = Math.min(prevAf + afStep, afMax);
        } else {
          ep[i] = prevEp;
          af[i] = prevAf;
        }
      }
    }
  }

  return sar.map((value, i) => ({ value, isUptrend: trend[i] === 1 }));
}
