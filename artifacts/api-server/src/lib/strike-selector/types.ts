import type { SignalType, TechIndicators } from "../scoring/types.js";
import type { BrokerMarketData, OptionStrike } from "../broker/types.js";
import type { ICTContext } from "../ict/types.js";

export interface StrikeScore {
  strike: OptionStrike;

  score: number; 
  
recommendation:
  | "BEST"
  | "GOOD"
  | "SAFE"
  | "AGGRESSIVE"
  | "AVOID";

  premiumScore: number;
  oiScore: number;
  deltaScore: number;
  ivScore: number;
  distanceScore: number;

  reason: string[];
}

export interface StrikeRecommendation {

  signalType: SignalType;

  recommended: StrikeScore;

  safe: StrikeScore;

  aggressive: StrikeScore;

  marketType:
    | "TRENDING_BULLISH"
    | "TRENDING_BEARISH"
    | "SIDEWAYS"
    | "VOLATILE";

  entryWindow: {
    from: string;
    to: string;
    lastSafeEntry: string;
  };

  exitPlan: {
    targetExit: string;
    timeExit: string;
  };

  entryAllowed: boolean;

thetaFavorable: boolean;

liquidityRisk:
  | "LOW"
  | "MEDIUM"
  | "HIGH";

reason: string;

  confidence: number;
}

export interface StrikeSelectorInput {

  signalType: SignalType;

  market: BrokerMarketData;

  indicators: TechIndicators; 

  ict: ICTContext; 
}

export type TradeAction =
  | "CALL_BUY"
  | "CALL_SELL"
  | "PUT_BUY"
  | "PUT_SELL";

export interface StrikeCandidate {
  strike: number;
  optionType: "CE" | "PE";

  ltp: number;
  iv: number;
  delta: number;
  gamma: number;
  theta: number;
  vega: number;

  oi: number;
  oiChange: number;
  volume: number;

  score: number;

  recommendation:
    | "BEST"
    | "GOOD"
    | "SAFE"
    | "AGGRESSIVE"
    | "AVOID";

  reason: string[];
}

export interface StrikeSelectionResult {
  action: TradeAction;

  bestStrike: StrikeCandidate;

  rankedStrikes: StrikeCandidate[];

  generatedAt: string;
}