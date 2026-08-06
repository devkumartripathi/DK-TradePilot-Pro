import type {
  StrikeCandidate,
  StrikeSelectorInput,
  StrikeScore,
} from "./types.js";

function clamp(v: number, min = 0, max = 100) {
  return Math.max(min, Math.min(max, v));
}

export function scoreStrike(
  input: StrikeSelectorInput,
  strikeIndex: number
): StrikeScore {

  const strike = input.market.optionChain.strikes[strikeIndex];

  const isCall =
    input.signalType === "CALL_BUY" ||
    input.signalType === "CALL_SELL";

  const option = isCall ? strike.call : strike.put;

  let premiumScore = 0;
  let deltaScore = 0;
  let ivScore = 0;
  let oiScore = 0;
  let distanceScore = 0;

  const reasons: string[] = [];

  // Premium Quality
  if (option.ltp >= 15 && option.ltp <= 80) {
    premiumScore = 25;
    reasons.push("Ideal Premium");
  } else if (option.ltp >= 8 && option.ltp <= 120) {
    premiumScore = 18;
    reasons.push("Acceptable Premium");
  } else {
    premiumScore = 8;
    reasons.push("Poor Premium");
  }

  // Delta
  const delta = Math.abs(option.delta);

  if (delta >= 0.20 && delta <= 0.35) {
    deltaScore = 20;
    reasons.push("Good Delta");
  } else if (delta >= 0.15 && delta <= 0.50) {
    deltaScore = 15;
  } else {
    deltaScore = 5;
  }

  // IV
  if (option.iv >= 10 && option.iv <= 25) {
    ivScore = 15;
    reasons.push("Healthy IV");
  } else {
    ivScore = 8;
  }

  // OI
  if (option.oi > 0) {
    oiScore = clamp(option.oi / 400000);
    oiScore = Math.min(20, oiScore);
  }
  if (option.oi >= 1_000_000) {
      reasons.push("Strong Open Interest");
    } else if (option.oi >= 500_000) {
      reasons.push("Good Liquidity");
    } else {
      reasons.push("Low Liquidity");
    }

  // Distance from ATM
  const atm = input.market.optionChain.atmStrike;

  const dist = Math.abs(strike.strike - atm);

  if (dist === 0)
    distanceScore = 20;
  else if (dist <= 50)
    distanceScore = 18;
  else if (dist <= 100)
    distanceScore = 15;
  else
    distanceScore = 8; 
 
if (dist === 0) { 
      reasons.push("ATM Strike");
    } else if (dist <= 50) {
      reasons.push("Near ATM");
    } else {
      reasons.push("Far OTM");
    
    } 
    
  const total = 
  
    premiumScore +
    deltaScore +
    ivScore +
    oiScore +
    distanceScore;
let recommendation: StrikeCandidate["recommendation"];

    if (total >= 90)
      recommendation = "BEST";
    else if (total >= 80)
      recommendation = "GOOD";
    else if (total >= 70)
      recommendation = "SAFE";
    else if (total >= 60)
      recommendation = "AGGRESSIVE";
    else
      recommendation = "AVOID";

  return {

    strike,

    score: total, 

    recommendation, 

    premiumScore,

    deltaScore,

    ivScore,

    oiScore,

    distanceScore,

    reason: reasons,

  };
}