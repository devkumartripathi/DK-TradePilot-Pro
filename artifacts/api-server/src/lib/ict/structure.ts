/**
 * ICT Market Structure Detection
 * — Swing points, BOS, CHOCH, MSS, trend direction.
 *
 * All algorithms are pure functions over OHLCV arrays.
 * Adapted from ICT (Inner Circle Trader) methodology.
 */

import type { OHLCV } from "../broker/types.js";
import type {
  SwingPoint, BosEvent, ChochEvent, MssEvent,
  TrendDirection, Strength, StructureDirection
} from "./types.js";

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Swing Detection ──────────────────────────────────────────────────────────

/**
 * Detect swing highs and lows using a pivot lookback window.
 * A swing high at [i] requires candles[i].high to be strictly greater than
 * all other highs in [i-lookback .. i+lookback].
 */
export function detectSwings(candles: OHLCV[], lookback = 3): SwingPoint[] {
  const swings: SwingPoint[] = [];
  const len = candles.length;

  for (let i = lookback; i < len - lookback; i++) {
    const c = candles[i];

    let isHigh = true, isLow = true;
    for (let j = i - lookback; j <= i + lookback; j++) {
      if (j === i) continue;
      if (candles[j].high >= c.high) isHigh = false;
      if (candles[j].low <= c.low) isLow = false;
    }

    if (isHigh) {
      swings.push({
        index: i, price: c.high, time: c.time, type: "HIGH",
        strength: lookback >= 5 ? "MAJOR" : "MINOR",
      });
    }
    if (isLow) {
      swings.push({
        index: i, price: c.low, time: c.time, type: "LOW",
        strength: lookback >= 5 ? "MAJOR" : "MINOR",
      });
    }
  }

  return swings.sort((a, b) => a.index - b.index);
}

// ── Trend Direction ──────────────────────────────────────────────────────────

export function detectTrend(swings: SwingPoint[]): { trend: TrendDirection; strength: Strength } {
  const highs = swings.filter(s => s.type === "HIGH");
  const lows  = swings.filter(s => s.type === "LOW");

  if (highs.length < 2 || lows.length < 2) return { trend: "SIDEWAYS", strength: "WEAK" };

  const lastHighs = highs.slice(-3);
  const lastLows  = lows.slice(-3);

  const hhCount = countSequence(lastHighs.map(s => s.price), (a, b) => b > a);
  const hlCount = countSequence(lastLows.map(s => s.price), (a, b) => b > a);
  const llCount = countSequence(lastLows.map(s => s.price), (a, b) => b < a);
  const lhCount = countSequence(lastHighs.map(s => s.price), (a, b) => b < a);

  if (hhCount >= 1 && hlCount >= 1) {
    return { trend: "UPTREND", strength: hhCount >= 2 && hlCount >= 2 ? "STRONG" : "MODERATE" };
  }
  if (llCount >= 1 && lhCount >= 1) {
    return { trend: "DOWNTREND", strength: llCount >= 2 && lhCount >= 2 ? "STRONG" : "MODERATE" };
  }
  return { trend: "SIDEWAYS", strength: "WEAK" };
}

function countSequence(prices: number[], cmp: (a: number, b: number) => boolean): number {
  let count = 0;
  for (let i = 0; i < prices.length - 1; i++) {
    if (cmp(prices[i], prices[i + 1])) count++;
  }
  return count;
}

// ── BOS / CHOCH Detection ────────────────────────────────────────────────────

export interface StructureResult {
  bos: BosEvent[];
  choch: ChochEvent[];
  mss: MssEvent[];
  finalTrend: TrendDirection;
}

/**
 * Detect BOS and CHOCH by scanning candles in order, tracking trend state.
 *
 * BOS  = break of structure in the direction of the current trend (continuation)
 * CHOCH = break against the trend (potential reversal)
 * MSS  = CHOCH confirmed by a subsequent BOS in the new direction
 */
export function detectStructureEvents(
  candles: OHLCV[],
  swings: SwingPoint[],
  initialTrend: TrendDirection
): StructureResult {
  const bos: BosEvent[] = [];
  const choch: ChochEvent[] = [];
  const mss: MssEvent[] = [];
  const total = candles.length;

  let trend = initialTrend === "SIDEWAYS" ? "UPTREND" : initialTrend; // seed

  // Pre-sorted swing highs/lows for fast lookup
  const swingHighs = swings.filter(s => s.type === "HIGH");
  const swingLows  = swings.filter(s => s.type === "LOW");

  // Track which swing we're monitoring to avoid re-detecting the same break
  let lastBosHighIdx = -1, lastBosLowIdx = -1;
  let lastChochHighIdx = -1, lastChochLowIdx = -1;

  for (let i = 5; i < total; i++) {
    const c = candles[i];

    const relevantHighs = swingHighs.filter(s => s.index < i - 1);
    const relevantLows  = swingLows.filter(s => s.index < i - 1);
    if (!relevantHighs.length || !relevantLows.length) continue;

    const lastHigh = relevantHighs.at(-1)!;
    const lastLow  = relevantLows.at(-1)!;

    if (trend === "UPTREND") {
      // BOS bullish: break above prior swing high (continuation)
      if (c.close > lastHigh.price && lastHigh.index !== lastBosHighIdx) {
        lastBosHighIdx = lastHigh.index;
        const candlesSince = i - lastHigh.index;
        const strength = strengthFromSize(c.close - lastHigh.price);
        bos.push({ kind: "BOS", direction: "BULLISH", level: r2(lastHigh.price), candleIndex: i, time: c.time, strength, candlesSinceBreak: candlesSince });
      }
      // CHOCH bearish: close below prior swing low (trend reversal warning)
      if (c.close < lastLow.price && lastLow.index !== lastChochLowIdx) {
        lastChochLowIdx = lastLow.index;
        const strength = strengthFromSize(lastLow.price - c.close);
        choch.push({ kind: "CHOCH", direction: "BEARISH", level: r2(lastLow.price), candleIndex: i, time: c.time, strength, candlesSinceBreak: i - lastLow.index });
        trend = "DOWNTREND";

        // Check for immediate MSS confirmation
        const nextBosCandidate = bos.find(b => b.candleIndex > i && b.direction === "BEARISH");
        if (nextBosCandidate) {
          mss.push({ kind: "MSS", direction: "BEARISH", level: r2(lastLow.price), time: c.time, confirmedBy: "CHOCH" });
        }
      }
    } else if (trend === "DOWNTREND") {
      // BOS bearish: close below prior swing low (continuation)
      if (c.close < lastLow.price && lastLow.index !== lastBosLowIdx) {
        lastBosLowIdx = lastLow.index;
        const strength = strengthFromSize(lastLow.price - c.close);
        bos.push({ kind: "BOS", direction: "BEARISH", level: r2(lastLow.price), candleIndex: i, time: c.time, strength, candlesSinceBreak: i - lastLow.index });
      }
      // CHOCH bullish: close above prior swing high (reversal)
      if (c.close > lastHigh.price && lastHigh.index !== lastChochHighIdx) {
        lastChochHighIdx = lastHigh.index;
        const strength = strengthFromSize(c.close - lastHigh.price);
        choch.push({ kind: "CHOCH", direction: "BULLISH", level: r2(lastHigh.price), candleIndex: i, time: c.time, strength, candlesSinceBreak: i - lastHigh.index });
        trend = "UPTREND";
      }
    }
  }

  // MSS: a CHOCH followed by a BOS in the same new direction within 10 candles
  for (const c of choch) {
    const confirmBos = bos.find(b =>
      b.direction === c.direction &&
      b.candleIndex > c.candleIndex &&
      b.candleIndex - c.candleIndex <= 10
    );
    if (confirmBos && !mss.find(m => m.time === c.time)) {
      mss.push({ kind: "MSS", direction: c.direction, level: c.level, time: c.time, confirmedBy: "CHOCH" });
    }
  }

  return { bos, choch, mss, finalTrend: trend as TrendDirection };
}

function strengthFromSize(pts: number): Strength {
  return pts > 50 ? "STRONG" : pts > 20 ? "MODERATE" : "WEAK";
}

// ── Current Bias ─────────────────────────────────────────────────────────────

export function computeBias(
  trend: TrendDirection,
  choch: ChochEvent[],
  bos: BosEvent[],
  candles: OHLCV[]
): StructureDirection {
  const total = candles.length;
  // The most recent structural event in the last 15 candles wins
  const recent = [
    ...choch.filter(e => total - e.candleIndex <= 15).map(e => ({ ...e, time: e.time })),
    ...bos.filter(e => total - e.candleIndex <= 15),
  ].sort((a, b) => b.candleIndex - a.candleIndex);

  if (recent.length) return recent[0].direction;
  if (trend === "UPTREND") return "BULLISH";
  if (trend === "DOWNTREND") return "BEARISH";
  return "NEUTRAL";
}
