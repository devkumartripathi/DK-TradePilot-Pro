/**
 * Scoring engine types.
 */

export type SignalType = "CALL_BUY" | "CALL_SELL" | "PUT_BUY" | "PUT_SELL";

export interface ScoreFactor {
  name: string;
  score: number;
  maxScore: number;
  signal: string;
  category: "PRIMARY" | "CONFIRM" | "SUPPORT";
}

export interface ScoredSignal {
  type: SignalType;
  confidence: number;    // 0-100
  factors: ScoreFactor[];
  totalScore: number;
  maxPossibleScore: number;
}

/** Computed technical indicators (input to scoring). */
export interface TechIndicators {
  rsi: number;
  ema20: number;
  ema50: number;
  atr: number;
  vwap: number;
  pcr: number;
  vix: number;
  callOI: number;
  putOI: number;
  maxPain: number;
  volume: number;
  atmIV: number;           // ATM Implied Volatility
  atmCallDelta: number;    // ATM call delta (~0.5)
  atmPutDelta: number;     // ATM put delta (~-0.5)
  oiChangeBull: number;    // Put OI change (positive = put writing = bullish)
  oiChangeBear: number;    // Call OI change (positive = call writing = bearish)
  // Derived
  rsiSignal: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" | "RISING" | "FALLING";
  emaSignal: "BULLISH" | "BEARISH" | "NEUTRAL";
  vwapPosition: "ABOVE" | "BELOW" | "AT";
  volumeSignal: "HIGH" | "AVERAGE" | "LOW";
  adx: number;
}
