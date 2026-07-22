export function calculateRSI(
  close: number[],
  period: number = 14
): number[] {
  if (close.length < period + 1) {
    return [];
  }

  const rsi: number[] = [];

  let gain = 0;
  let loss = 0;

  for (let i = 1; i <= period; i++) {
    const change = close[i] - close[i - 1];

    if (change > 0) {
      gain += change;
    } else {
      loss += Math.abs(change);
    }
  }

  let avgGain = gain / period;
  let avgLoss = loss / period;

  rsi.push(
    avgLoss === 0
      ? 100
      : 100 - 100 / (1 + avgGain / avgLoss)
  );

  for (let i = period + 1; i < close.length; i++) {
    const change = close[i] - close[i - 1];

    const currentGain = change > 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain =
      (avgGain * (period - 1) + currentGain) / period;

    avgLoss =
      (avgLoss * (period - 1) + currentLoss) / period;

    rsi.push(
      avgLoss === 0
        ? 100
        : 100 - 100 / (1 + avgGain / avgLoss)
    );
  }

  return rsi;
}
