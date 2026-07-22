export function calculateEMA(
  values: number[],
  period: number
): number[] {
  if (values.length < period) {
    return [];
  }

  const multiplier = 2 / (period + 1);

  const ema: number[] = [];

  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += values[i];
  }

  let previousEMA = sum / period;

  ema.push(previousEMA);

  for (let i = period; i < values.length; i++) {
    previousEMA =
      (values[i] - previousEMA) * multiplier +
      previousEMA;

    ema.push(previousEMA);
  }

  return ema;
}