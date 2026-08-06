export type SmcConfluenceResult = {
  score: number;
  confidence: number;
  rating: "LOW" | "MEDIUM" | "HIGH" | "EXTREME";
  direction: "BUY" | "SELL" | "WAIT";
  reasons: string[];
};

export function calculateSmcScore(smc: any): SmcConfluenceResult {
  let score = 50;
  const reasons: string[] = [];

  // Trend
  if (smc.marketStructure?.trend === "UPTREND") {
    score += 20;
    reasons.push("Bullish Market Structure");
  } else if (smc.marketStructure?.trend === "DOWNTREND") {
    score -= 20;
    reasons.push("Bearish Market Structure");
  }

  // BOS
  for (const bos of smc.bos ?? []) {
    if (bos.direction === "BULLISH") {
      if (bos.strength === "STRONG") score += 15;
      else if (bos.strength === "MODERATE") score += 10;
      else score += 5;
    }
  }

  // CHOCH
  for (const c of smc.choch ?? []) {
    if (c.direction === "BULLISH") score += 10;
    if (c.direction === "BEARISH") score -= 10;
  }

  // Active Bullish Order Blocks
  for (const ob of smc.orderBlocks ?? []) {
    if (ob.type === "BULLISH" && !ob.mitigated) {
      if (ob.strength === "STRONG") score += 20;
      else if (ob.strength === "MODERATE") score += 12;
      else score += 5;
    }
  }

  // Bullish FVG
  for (const fvg of smc.fairValueGaps ?? []) {
    if (fvg.type === "BULLISH" && !fvg.filled) {
      score += 10;
    }
  }

  score = Math.max(0, Math.min(100, score));

  const confidence = score;

  const rating =
    score >= 90
      ? "EXTREME"
      : score >= 75
      ? "HIGH"
      : score >= 60
      ? "MEDIUM"
      : "LOW";

  const direction =
    score >= 70 ? "BUY" :
    score <= 30 ? "SELL" :
    "WAIT";

  return {
    score,
    confidence,
    rating,
    direction,
    reasons,
  };
}