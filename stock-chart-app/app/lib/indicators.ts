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
