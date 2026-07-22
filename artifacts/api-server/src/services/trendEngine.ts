export interface TrendResult {
  trend: "Bullish" | "Bearish" | "Sideways";
  signal: "BUY" | "SELL" | "WAIT";
  strength: number;
  reason: string[];
}

export function getTrend(
  price: number,
  ema8: number,
  ema20: number,
  ema50: number,
  ema100: number,
  rsi: number
): TrendResult {

  const reason: string[] = [];

  let bullish = 0;
  let bearish = 0;

  if (price > ema8) bullish++;
  else bearish++;

  if (price > ema20) bullish++;
  else bearish++;

  if (price > ema50) bullish++;
  else bearish++;

  if (price > ema100) bullish++;
  else bearish++;

  if (ema8 > ema20 && ema20 > ema50 && ema50 > ema100) {
    bullish += 2;
    reason.push("EMA Bullish Alignment");
  }

  if (ema8 < ema20 && ema20 < ema50 && ema50 < ema100) {
    bearish += 2;
    reason.push("EMA Bearish Alignment");
  }

  if (rsi > 60) {
    bullish++;
    reason.push("Strong RSI");
  }

  if (rsi < 40) {
    bearish++;
    reason.push("Weak RSI");
  }

  if (bullish > bearish) {
    return {
      trend: "Bullish",
      signal: "BUY",
      strength: Math.round((bullish / (bullish + bearish)) * 100),
      reason,
    };
  }

  if (bearish > bullish) {
    return {
      trend: "Bearish",
      signal: "SELL",
      strength: Math.round((bearish / (bullish + bearish)) * 100),
      reason,
    };
  }

  return {
    trend: "Sideways",
    signal: "WAIT",
    strength: 50,
    reason,
  };
}