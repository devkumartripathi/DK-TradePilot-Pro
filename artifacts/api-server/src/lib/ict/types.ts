/**
 * ICT / Smart Money Concepts — type definitions.
 * All ICT structural elements detected algorithmically from OHLCV candles.
 */

export interface SwingPoint {
  index: number;
  price: number;
  time: string;
  type: "HIGH" | "LOW";
  strength: "MAJOR" | "MINOR";   // MAJOR = survives multi-candle lookback
}

// ── Market Structure ────────────────────────────────────────────────────────

export type StructureDirection = "BULLISH" | "BEARISH" | "NEUTRAL";
export type TrendDirection = "UPTREND" | "DOWNTREND" | "SIDEWAYS";
export type Strength = "STRONG" | "MODERATE" | "WEAK";

export interface BosEvent {
  kind: "BOS";
  direction: StructureDirection;   // Direction of the break
  level: number;                   // Swing point that was broken
  candleIndex: number;             // Candle that broke the level
  time: string;
  strength: Strength;
  candlesSinceBreak: number;       // How recent (computed at read time)
}

export interface ChochEvent {
  kind: "CHOCH";
  direction: StructureDirection;   // New bias direction after CHOCH
  level: number;                   // Swing point that was broken
  candleIndex: number;
  time: string;
  strength: Strength;
  candlesSinceBreak: number;
}

export interface MssEvent {
  kind: "MSS";
  direction: StructureDirection;
  level: number;
  time: string;
  confirmedBy: "BOS" | "CHOCH";
}

// ── Order Blocks ────────────────────────────────────────────────────────────

export interface OrderBlock {
  id: string;
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  midpoint: number;
  time: string;
  candleIndex: number;
  timeframe: string;
  mitigated: boolean;             // Did price return into the OB?
  strength: Strength;
  distanceFromPrice: number;      // Computed at read time (points from current price)
  impulseMagnitude: number;       // Size of the move that created this OB
}

// ── Breaker Blocks ─────────────────────────────────────────────────────────

export interface BreakerBlock {
  id: string;
  type: "BULLISH" | "BEARISH";   // Direction it now acts as (opposite of origin OB)
  top: number;
  bottom: number;
  time: string;
  originOBId: string;
}

// ── Fair Value Gaps ─────────────────────────────────────────────────────────

export interface FVG {
  id: string;
  type: "BULLISH" | "BEARISH";
  top: number;
  bottom: number;
  size: number;                   // Gap size in points
  filled: boolean;
  fillPercent: number;
  time: string;
  candleIndex: number;
}

// ── Liquidity ───────────────────────────────────────────────────────────────

export interface LiquidityLevel {
  type: "BSL" | "SSL";           // Buy-side or sell-side
  level: number;
  time: string;
  strength: Strength;
}

export interface LiquiditySweep {
  type: "BSL_SWEEP" | "SSL_SWEEP";
  level: number;                  // The level that was swept
  sweepHigh: number;              // How far it was swept
  reversalSize: number;           // Reversal from sweep to close
  candleIndex: number;
  time: string;
  confirmed: boolean;             // Did it close back through the level?
}

// ── Full ICT Context ────────────────────────────────────────────────────────

export interface ICTContext {
  // Input data summary
  candleCount: number;
  timeframe: string;
  lastCandleTime: string;
  currentPrice: number;

  // Market structure
  trendDirection: TrendDirection;
  trendStrength: Strength;
  swings: SwingPoint[];
  bos: BosEvent[];
  choch: ChochEvent[];
  mss: MssEvent[];

  // Key zones
  orderBlocks: OrderBlock[];
  breakerBlocks: BreakerBlock[];
  fvgs: FVG[];
  liquidityLevels: LiquidityLevel[];
  liquiditySweeps: LiquiditySweep[];

  // Derived current-state flags (used by scoring engine)
  currentBias: StructureDirection;

  // Most recent / nearest events (null if none)
  lastBos: BosEvent | null;
  lastChoch: ChochEvent | null;
  lastMss: MssEvent | null;
  recentBSLSweep: LiquiditySweep | null;   // last BSL sweep within N candles
  recentSSLSweep: LiquiditySweep | null;   // last SSL sweep within N candles
  nearestBullishOB: OrderBlock | null;      // nearest unmitigated bullish OB to price
  nearestBearishOB: OrderBlock | null;      // nearest unmitigated bearish OB to price
  recentBullishFVG: FVG | null;
  recentBearishFVG: FVG | null;
  nearestBullishBreaker: BreakerBlock | null;
  nearestBearishBreaker: BreakerBlock | null;

  // Sweep recency flags
  bslSweptRecently: boolean;    // BSL sweep in last 8 candles
  sslSweptRecently: boolean;    // SSL sweep in last 8 candles
}
