import { scoreStrike } from "./scoring.js";
import { buildTimingPlan } from "./timing.js";

import type {
  StrikeRecommendation,
  StrikeSelectorInput,
  StrikeScore,
} from "./types.js";

/**
 * ---------------------------------------------------------
 * MARKET CLASSIFICATION
 * ---------------------------------------------------------
 */

function classifyMarket(
  input: StrikeSelectorInput
): StrikeRecommendation["marketType"] {

  const { adx, emaSignal, vix } = input.indicators;

  const {
    currentBias,
    trendDirection,
    trendStrength,
  } = input.ict;

  // High volatility overrides everything
  if (vix >= 20)
    return "VOLATILE";

  // Strong ICT trend has highest priority
  if (
    trendDirection === "DOWNTREND" &&
    currentBias === "BEARISH" &&
    trendStrength === "STRONG"
  ) {
    return "TRENDING_BEARISH";
  }

  if (
    trendDirection === "UPTREND" &&
    currentBias === "BULLISH" &&
    trendStrength === "STRONG"
  ) {
    return "TRENDING_BULLISH";
  }

  // Weak trend = Sideways
  if (
    adx < 20 ||
    trendDirection === "SIDEWAYS"
  ) {
    return "SIDEWAYS";
  }

  // EMA fallback
  if (emaSignal === "BEARISH")
    return "TRENDING_BEARISH";

  if (emaSignal === "BULLISH")
    return "TRENDING_BULLISH";

  return "SIDEWAYS";
}

/**
 * ---------------------------------------------------------
 * MARKET REGIME BONUS
 * ---------------------------------------------------------
 */

function applyMarketBias(
  score: StrikeScore,
  input: StrikeSelectorInput,
  marketType: StrikeRecommendation["marketType"]
): number {

  let bonus = 0;

  switch (marketType) {

    case "TRENDING_BEARISH":

      if (input.signalType === "PUT_BUY")
        bonus += 10;

      if (input.signalType === "CALL_SELL")
        bonus += 6;

      break;

    case "TRENDING_BULLISH":

      if (input.signalType === "CALL_BUY")
        bonus += 10;

      if (input.signalType === "PUT_SELL")
        bonus += 6;

      break;

    case "SIDEWAYS":

      if (
        input.signalType === "CALL_SELL" ||
        input.signalType === "PUT_SELL"
      ) {
        bonus += 8;
      }

      break;

    case "VOLATILE":

      if (
        input.signalType === "CALL_BUY" ||
        input.signalType === "PUT_BUY"
      ) {
        bonus += 4;
      }

      break;
  }

  return score.score + bonus;
}

/**
 * ---------------------------------------------------------
 * SELLER PRIORITY BONUS
 * ---------------------------------------------------------
 */

function applySellerPreference(
  score: StrikeScore,
  input: StrikeSelectorInput
): number {

  let bonus = 0;

  const isSeller =
    input.signalType === "CALL_SELL" ||
    input.signalType === "PUT_SELL";

  if (!isSeller)
    return score.score;

  if (score.distanceScore >= 15)
    bonus += 4;

  if (score.oiScore >= 10)
    bonus += 4;

  if (score.ivScore >= 15)
    bonus += 3;

  return score.score + bonus;
}

export function selectStrike(
  input: StrikeSelectorInput
): StrikeRecommendation {

  const marketType = classifyMarket(input);

  const scored: StrikeScore[] =
    input.market.optionChain.strikes
      .map((_, index) => {

        const base = scoreStrike(input, index);

        const marketScore =
          applyMarketBias(
            base,
            input,
            marketType
          );

        const sellerScore =
          applySellerPreference(
            base,
            input
          );

        return {
          ...base,
          score:
            Math.round(
              (marketScore + sellerScore) / 2
            ),
        };

      })
      .sort(
        (a, b) => b.score - a.score
      );

  const recommended =
    scored[0];

  const safe =
    scored.find(
      s =>
        s.strike.strike !==
        recommended.strike.strike
    ) ?? recommended;

  const aggressive =
    scored.find(
      s =>
        s.strike.strike !==
          recommended.strike.strike &&
        s.strike.strike !==
          safe.strike.strike
    ) ?? recommended;

  const timing =
    buildTimingPlan();
    return {
    signalType: input.signalType,

    recommended,

    safe,

    aggressive,

    marketType,

    entryWindow: timing.entryWindow,

    exitPlan: timing.exitPlan,

    entryAllowed: timing.entryAllowed,

    thetaFavorable: timing.thetaFavorable,

    liquidityRisk: timing.liquidityRisk,

    reason: timing.reason,

    confidence: recommended.score,
  };
}
