export type MarketCurrentStatus = {
  status: string;
  score: number;
  summary: string;
  avoid: string;
  watch: number;
  atmStrike: number;
  watchStrike: number;
};

type Input = {
  trend?: string;
  rsi?: number;
  vwapPosition?: string;
  adx?: number;
  pcr?: number;
  vix?: number;
  price?: number; 
};

export function getMarketCurrentStatus(input: Input): MarketCurrentStatus { 
  const price = input.price ?? 0;
  const atmStrike = Math.round(price / 50) * 50;
  const watchStrike = atmStrike;
  let score = 0;

  if (input.trend === "BULLISH") score += 2;
  else if (input.trend === "BEARISH") score -= 2;

  if (input.vwapPosition === "ABOVE") score += 2;
  else if (input.vwapPosition === "BELOW") score -= 2;

  if ((input.rsi ?? 50) >= 55) score += 2;
  else if ((input.rsi ?? 50) <= 45) score -= 2;

  if ((input.adx ?? 0) >= 25) score += 2;
  else if ((input.adx ?? 0) >= 18) score += 1;

  if ((input.pcr ?? 1) >= 1.0) score += 1;
  else score -= 1;

  if ((input.vix ?? 15) < 14) score += 1;
  else if ((input.vix ?? 15) > 18) score -= 1;

  let status = "RANGE";
  let avoid = "Breakout chasing";

  if (score >= 8) {
    status = "STRONG BULLISH";
    avoid = "Fresh PE sell";
  } else if (score >= 5) {
    status = "BULLISH";
    avoid = "Fresh PE sell";
  } else if (score <= -8) {
    status = "STRONG BEARISH";
    avoid = "Fresh CE buy";
  } else if (score <= -5) {
    status = "BEARISH";
    avoid = "Fresh CE buy";
  } else if (score >= 2) {
    status = "NEUTRAL";
    avoid = "Counter-trend trades";
  }

  const parts: string[] = [];

  if (input.vwapPosition === "ABOVE") parts.push("VWAP support");
  if (input.vwapPosition === "BELOW") parts.push("VWAP resistance");

  if ((input.rsi ?? 50) >= 55) parts.push("RSI positive");
  else if ((input.rsi ?? 50) <= 45) parts.push("RSI weak");

  if ((input.adx ?? 0) >= 25) parts.push("ADX active");
  else parts.push("ADX weak");

  return {
    status,
    score,
    summary: parts.slice(0, 3).join(" • "),
    avoid,
    watch: watchStrike,
    atmStrike,
    watchStrike,
  };
}