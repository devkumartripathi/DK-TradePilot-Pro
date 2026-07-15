/**
 * ICT Order Blocks, Breaker Blocks, and Fair Value Gaps.
 * Detected algorithmically from OHLCV candle data.
 */

import type { OHLCV } from "../broker/types.js";
import type { SwingPoint, BosEvent, OrderBlock, BreakerBlock, FVG } from "./types.js";

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Order Blocks ─────────────────────────────────────────────────────────────

/**
 * Detect Order Blocks from BOS events.
 *
 * Bullish OB = the last bearish (red) candle before a bullish impulse move
 *   that caused a BOS bullish.
 * Bearish OB = the last bullish (green) candle before a bearish impulse move
 *   that caused a BOS bearish.
 */
export function detectOrderBlocks(
  candles: OHLCV[],
  bos: BosEvent[],
  currentPrice: number,
  timeframe = "15m"
): OrderBlock[] {
  const obs: OrderBlock[] = [];
  let idCounter = 0;

  for (const b of bos) {
    const bosIdx = b.candleIndex;
    if (bosIdx < 2) continue;

    if (b.direction === "BULLISH") {
      // Look back from the BOS candle for the last bearish (red) candle
      let obIdx = -1;
      for (let i = bosIdx - 1; i >= Math.max(0, bosIdx - 15); i--) {
        if (candles[i].close < candles[i].open) { obIdx = i; break; }
      }
      if (obIdx < 0) continue;

      const obCandle = candles[obIdx];
      const magnitude = candles[bosIdx].close - obCandle.low;
      const mitigated = candles.slice(obIdx + 1).some(c => c.low <= obCandle.high && c.high >= obCandle.low);

      obs.push({
        id: `BOB_${++idCounter}`,
        type: "BULLISH",
        top: r2(obCandle.high),
        bottom: r2(obCandle.low),
        midpoint: r2((obCandle.high + obCandle.low) / 2),
        time: obCandle.time,
        candleIndex: obIdx,
        timeframe,
        mitigated,
        strength: magnitude > 60 ? "STRONG" : magnitude > 30 ? "MODERATE" : "WEAK",
        distanceFromPrice: r2(currentPrice - (obCandle.high + obCandle.low) / 2),
        impulseMagnitude: r2(magnitude),
      });
    }

    if (b.direction === "BEARISH") {
      // Look back for last bullish (green) candle
      let obIdx = -1;
      for (let i = bosIdx - 1; i >= Math.max(0, bosIdx - 15); i--) {
        if (candles[i].close > candles[i].open) { obIdx = i; break; }
      }
      if (obIdx < 0) continue;

      const obCandle = candles[obIdx];
      const magnitude = obCandle.high - candles[bosIdx].close;
      const mitigated = candles.slice(obIdx + 1).some(c => c.high >= obCandle.low && c.low <= obCandle.high);

      obs.push({
        id: `BOB_${++idCounter}`,
        type: "BEARISH",
        top: r2(obCandle.high),
        bottom: r2(obCandle.low),
        midpoint: r2((obCandle.high + obCandle.low) / 2),
        time: obCandle.time,
        candleIndex: obIdx,
        timeframe,
        mitigated,
        strength: magnitude > 60 ? "STRONG" : magnitude > 30 ? "MODERATE" : "WEAK",
        distanceFromPrice: r2((obCandle.high + obCandle.low) / 2 - currentPrice),
        impulseMagnitude: r2(magnitude),
      });
    }
  }

  // Fix midpoints that need currentPrice context
  for (const ob of obs) {
    ob.distanceFromPrice = ob.type === "BULLISH"
      ? r2(currentPrice - (ob.top + ob.bottom) / 2)
      : r2((ob.top + ob.bottom) / 2 - currentPrice);
  }

  return obs;
}

// ── Breaker Blocks ────────────────────────────────────────────────────────────

/**
 * A Breaker Block is a former Order Block that has been violated.
 * When price returns into a breaker from the opposite side, it acts
 * as support (former bearish OB broken → bullish breaker) or
 * resistance (former bullish OB broken → bearish breaker).
 */
export function detectBreakerBlocks(
  obs: OrderBlock[],
  candles: OHLCV[]
): BreakerBlock[] {
  const breakers: BreakerBlock[] = [];

  for (const ob of obs) {
    if (!ob.mitigated) continue;

    // Check if price has broken completely through the OB
    const postOBCandles = candles.slice(ob.candleIndex + 1);
    const fullBreak = ob.type === "BULLISH"
      ? postOBCandles.some(c => c.close < ob.bottom - 5)    // bullish OB fully broken → bearish breaker
      : postOBCandles.some(c => c.close > ob.top + 5);       // bearish OB fully broken → bullish breaker

    if (fullBreak) {
      breakers.push({
        id: `BB_${ob.id}`,
        type: ob.type === "BULLISH" ? "BEARISH" : "BULLISH",
        top: ob.top,
        bottom: ob.bottom,
        time: ob.time,
        originOBId: ob.id,
      });
    }
  }

  return breakers;
}

// ── Fair Value Gaps ───────────────────────────────────────────────────────────

/**
 * FVG = imbalance between three consecutive candles.
 *
 * Bullish FVG: candle[i-2].high < candle[i].low
 *   (price jumped up — unfilled gap between them)
 * Bearish FVG: candle[i-2].low > candle[i].high
 *   (price jumped down — unfilled gap between them)
 */
export function detectFVGs(candles: OHLCV[], currentPrice: number): FVG[] {
  const fvgs: FVG[] = [];
  const minGapSize = 3; // minimum points to count as a meaningful FVG

  for (let i = 2; i < candles.length; i++) {
    const prev2 = candles[i - 2];
    const curr  = candles[i];

    // Bullish FVG
    if (curr.low > prev2.high + minGapSize) {
      const top = curr.low;
      const bot = prev2.high;
      const size = r2(top - bot);

      // Check fill — did a later candle's low enter the gap?
      const laterCandles = candles.slice(i + 1);
      const fillCandle = laterCandles.find(c => c.low <= top && c.high >= bot);
      const filled = !!fillCandle && fillCandle.low <= bot;
      const fillPct = fillCandle
        ? r2(Math.min(100, ((top - fillCandle.low) / size) * 100))
        : 0;

      fvgs.push({
        id: `FVG_B_${i}`,
        type: "BULLISH",
        top: r2(top), bottom: r2(bot), size,
        filled, fillPercent: fillPct,
        time: curr.time, candleIndex: i,
      });
    }

    // Bearish FVG
    if (prev2.low > curr.high + minGapSize) {
      const top = prev2.low;
      const bot = curr.high;
      const size = r2(top - bot);

      const laterCandles = candles.slice(i + 1);
      const fillCandle = laterCandles.find(c => c.high >= bot && c.low <= top);
      const filled = !!fillCandle && fillCandle.high >= top;
      const fillPct = fillCandle
        ? r2(Math.min(100, ((fillCandle.high - bot) / size) * 100))
        : 0;

      fvgs.push({
        id: `FVG_S_${i}`,
        type: "BEARISH",
        top: r2(top), bottom: r2(bot), size,
        filled, fillPercent: fillPct,
        time: curr.time, candleIndex: i,
      });
    }
  }

  return fvgs;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Nearest unmitigated OB of given type, closest to currentPrice */
export function nearestOB(
  obs: OrderBlock[],
  type: "BULLISH" | "BEARISH",
  currentPrice: number
): OrderBlock | null {
  return obs
    .filter(ob => ob.type === type && !ob.mitigated)
    .sort((a, b) => Math.abs(a.distanceFromPrice) - Math.abs(b.distanceFromPrice))
    [0] ?? null;
}

/** Most recent unfilled FVG of given type */
export function recentFVG(fvgs: FVG[], type: "BULLISH" | "BEARISH"): FVG | null {
  return fvgs
    .filter(f => f.type === type && !f.filled)
    .sort((a, b) => b.candleIndex - a.candleIndex)
    [0] ?? null;
}
