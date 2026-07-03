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
