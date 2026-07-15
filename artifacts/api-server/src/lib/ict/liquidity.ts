/**
 * ICT Liquidity Analysis
 * — Buy-Side Liquidity (BSL), Sell-Side Liquidity (SSL),
 *   and Liquidity Sweeps.
 *
 * Liquidity pools sit above swing highs (BSL) and below swing lows (SSL).
 * A sweep occurs when price wicks through a pool and then reverses back.
 */

import type { OHLCV } from "../broker/types.js";
import type { SwingPoint, LiquidityLevel, LiquiditySweep } from "./types.js";

const r2 = (n: number) => Math.round(n * 100) / 100;

// ── Liquidity Level Map ───────────────────────────────────────────────────────

/**
 * BSL sits above swing highs (institutions need to fill sell orders)
 * SSL sits below swing lows  (institutions need to fill buy orders)
 */
export function buildLiquidityLevels(swings: SwingPoint[]): LiquidityLevel[] {
  const levels: LiquidityLevel[] = [];
  for (const s of swings) {
    levels.push({
      type: s.type === "HIGH" ? "BSL" : "SSL",
      level: s.price,
      time: s.time,
      strength: s.strength === "MAJOR" ? "STRONG" : "MODERATE",
    });
  }
  return levels;
}

// ── Sweep Detection ───────────────────────────────────────────────────────────

/**
 * A BSL Sweep: candle's high exceeds a prior swing high but CLOSES below it.
 *   → Stop hunt complete: buy stops triggered, smart money sold into them.
 *
 * A SSL Sweep: candle's low exceeds a prior swing low but CLOSES above it.
 *   → Stop hunt complete: sell stops triggered, smart money bought into them.
 */
export function detectLiquiditySweeps(
  candles: OHLCV[],
  swings: SwingPoint[]
): LiquiditySweep[] {
  const sweeps: LiquiditySweep[] = [];
  const swingHighs = swings.filter(s => s.type === "HIGH");
  const swingLows  = swings.filter(s => s.type === "LOW");

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];

    // BSL Sweep: wick above swing high but close below it
    for (const sh of swingHighs) {
      if (sh.index >= i) continue;   // future swing — skip
      if (i - sh.index > 30) continue; // too old

      if (c.high > sh.price && c.close < sh.price) {
        // Verify this is a meaningful sweep (wick size vs body)
        const wickSize = c.high - Math.max(c.open, c.close);
        const reversal = c.high - c.close;
        if (reversal > 5) { // at least 5pts reversal
          sweeps.push({
            type: "BSL_SWEEP",
            level: r2(sh.price),
            sweepHigh: r2(c.high),
            reversalSize: r2(reversal),
            candleIndex: i,
            time: c.time,
            confirmed: reversal > wickSize * 0.5, // closed back through significantly
          });
        }
      }
    }

    // SSL Sweep: wick below swing low but close above it
    for (const sl of swingLows) {
      if (sl.index >= i) continue;
      if (i - sl.index > 30) continue;

      if (c.low < sl.price && c.close > sl.price) {
        const reversal = c.close - c.low;
        if (reversal > 5) {
          sweeps.push({
            type: "SSL_SWEEP",
            level: r2(sl.price),
            sweepHigh: r2(c.low),  // actually sweep LOW for SSL
            reversalSize: r2(reversal),
            candleIndex: i,
            time: c.time,
            confirmed: true,
          });
        }
      }
    }
  }

  // De-duplicate: same swing level swept multiple times — keep most recent
  const seen = new Map<string, LiquiditySweep>();
  for (const s of sweeps) {
    const key = `${s.type}_${s.level}`;
    if (!seen.has(key) || s.candleIndex > seen.get(key)!.candleIndex) {
      seen.set(key, s);
    }
  }

  return [...seen.values()].sort((a, b) => a.candleIndex - b.candleIndex);
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Return the most recent BSL sweep within the last N candles.
 * Used to confirm CALL SELL / PUT BUY setups.
 */
export function recentBSLSweep(
  sweeps: LiquiditySweep[],
  totalCandles: number,
  lookback = 8
): LiquiditySweep | null {
  return sweeps
    .filter(s => s.type === "BSL_SWEEP" && s.confirmed && totalCandles - s.candleIndex <= lookback)
    .sort((a, b) => b.candleIndex - a.candleIndex)
    [0] ?? null;
}

/**
 * Return the most recent SSL sweep within the last N candles.
 * Used to confirm CALL BUY / PUT SELL setups.
 */
export function recentSSLSweep(
  sweeps: LiquiditySweep[],
  totalCandles: number,
  lookback = 8
): LiquiditySweep | null {
  return sweeps
    .filter(s => s.type === "SSL_SWEEP" && s.confirmed && totalCandles - s.candleIndex <= lookback)
    .sort((a, b) => b.candleIndex - a.candleIndex)
    [0] ?? null;
}
