export function calculateATR(
  high: number[],
  low: number[],
  close: number[],
  period: number
): number[] {
  if (
    high.length !== low.length ||
    low.length !== close.length ||
    high.length < period + 1
  ) {
    return [];
  }

  const trueRanges: number[] = [];

  for (let i = 1; i < high.length; i++) {
    const tr = Math.max(
      high[i] - low[i],
      Math.abs(high[i] - close[i - 1]),
      Math.abs(low[i] - close[i - 1])
    );

    trueRanges.push(tr);
  }

  const atr: number[] = [];

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += trueRanges[i];
  }

  let previousATR = sum / period;

  atr.push(previousATR);

  for (let i = period; i < trueRanges.length; i++) {
    previousATR =
      (previousATR * (period - 1) + trueRanges[i]) / period;

    atr.push(previousATR);
  }

  return atr;
}