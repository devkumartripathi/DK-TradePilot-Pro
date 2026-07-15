/**
 * ICT Context Builder
 * Assembles the full ICTContext from OHLCV candles by running all detection modules.
 */

import type { OHLCV } from "../broker/types.js";
import type { ICTContext, LiquiditySweep, OrderBlock, BreakerBlock, FVG } from "./types.js";
import { detectSwings, detectTrend, detectStructureEvents, computeBias } from "./structure.js";
import { detectOrderBlocks, detectBreakerBlocks, detectFVGs, nearestOB, recentFVG } from "./blocks.js";
import { buildLiquidityLevels, detectLiquiditySweeps, recentBSLSweep, recentSSLSweep } from "./liquidity.js";

export function buildIctContext(
  candles: OHLCV[],
  currentPrice: number,
  timeframe = "15m"
): ICTContext {
  const total = candles.length;

  // 1. Swings (lookback 3 for minor, 5 for major — use 3 for intraday)
  const swings = detectSwings(candles, 3);

  // 2. Trend
  const { trend, strength: trendStrength } = detectTrend(swings);

  // 3. BOS / CHOCH / MSS
  const { bos, choch, mss, finalTrend } = detectStructureEvents(candles, swings, trend);

  // Stamp candlesSinceBreak relative to current
  const bosStamped  = bos.map(b  => ({ ...b,  candlesSinceBreak: total - b.candleIndex }));
  const chochStamped = choch.map(c => ({ ...c, candlesSinceBreak: total - c.candleIndex }));

  // 4. Order Blocks
  const obs = detectOrderBlocks(candles, bos, currentPrice, timeframe);

  // 5. Breaker Blocks
  const breakers = detectBreakerBlocks(obs, candles);

  // 6. FVGs
  const fvgs = detectFVGs(candles, currentPrice);

  // 7. Liquidity
  const liqLevels = buildLiquidityLevels(swings);
  const liqSweeps = detectLiquiditySweeps(candles, swings);

  // 8. Derived helpers
  const bias = computeBias(finalTrend, chochStamped, bosStamped, candles);

  const lastBos   = bosStamped.at(-1)   ?? null;
  const lastChoch = chochStamped.at(-1) ?? null;
  const lastMss   = mss.at(-1)          ?? null;

  const bslSweep = recentBSLSweep(liqSweeps, total, 20);
  const sslSweep = recentSSLSweep(liqSweeps, total, 20);

  const nBullOB = nearestOB(obs, "BULLISH", currentPrice);
  const nBearOB = nearestOB(obs, "BEARISH", currentPrice);

  const rBullFVG = recentFVG(fvgs, "BULLISH");
  const rBearFVG = recentFVG(fvgs, "BEARISH");

  const nBullBreaker = breakers.filter(b => b.type === "BULLISH")
    .sort((a, b) => Math.abs(parseFloat(a.top) - currentPrice) - Math.abs(parseFloat(b.top) - currentPrice))[0] ?? null;
  const nBearBreaker = breakers.filter(b => b.type === "BEARISH")
    .sort((a, b) => Math.abs(parseFloat(a.top) - currentPrice) - Math.abs(parseFloat(b.top) - currentPrice))[0] ?? null;

  return {
    candleCount: total,
    timeframe,
    lastCandleTime: candles.at(-1)?.time ?? "",
    currentPrice,
    trendDirection: finalTrend,
    trendStrength,
    swings,
    bos: bosStamped,
    choch: chochStamped,
    mss,
    orderBlocks: obs,
    breakerBlocks: breakers,
    fvgs,
    liquidityLevels: liqLevels,
    liquiditySweeps: liqSweeps,
    currentBias: bias,
    lastBos,
    lastChoch,
    lastMss,
    recentBSLSweep: bslSweep,
    recentSSLSweep: sslSweep,
    nearestBullishOB: nBullOB,
    nearestBearishOB: nBearOB,
    recentBullishFVG: rBullFVG,
    recentBearishFVG: rBearFVG,
    nearestBullishBreaker: nBullBreaker as BreakerBlock | null,
    nearestBearishBreaker: nBearBreaker as BreakerBlock | null,
    bslSweptRecently: !!bslSweep,
    sslSweptRecently: !!sslSweep,
  };
}
