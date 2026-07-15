/**
 * Signal Scoring Engine
 *
 * Scores each of the four option signal types using:
 *   - ICT structural context (BOS, CHOCH, OB, FVG, Liquidity Sweeps)
 *   - Technical indicators (RSI, EMA, ATR, VWAP, PCR, VIX, MaxPain, OI, Delta)
 *
 * Returns a confidence percentage (0–100).
 * Only signals ≥ 90% are emitted by the signal engine.
 *
 * CALL SELL and PUT SELL accuracy improvements:
 *   — RSI overbought/oversold is the PRIMARY gate (max weight, near-zero if not met)
 *   — BSL/SSL sweep is a PRIMARY gate (institutional stop-hunt confirmation)
 *   — CHOCH confirmation is a PRIMARY gate
 *   — All other factors are CONFIRM or SUPPORT
 */

import type { ICTContext } from "../ict/types.js";
import type { ScoreFactor, ScoredSignal, SignalType, TechIndicators } from "./types.js";

// ── Helpers ───────────────────────────────────────────────────────────────────

function r2(n: number) { return Math.round(n * 100) / 100; }
function clamp(v: number, lo: number, hi: number) { return Math.min(hi, Math.max(lo, v)); }

function f(
  list: ScoreFactor[],
  name: string, score: number, max: number,
  signal: string, cat: ScoreFactor["category"]
): void {
  list.push({ name, score: clamp(Math.round(score), 0, max), maxScore: max, signal, category: cat });
}

function pct(list: ScoreFactor[]): number {
  const total = list.reduce((s, x) => s + x.score, 0);
  const max   = list.reduce((s, x) => s + x.maxScore, 0);
  return r2((total / max) * 100);
}

// ── OB proximity scoring ──────────────────────────────────────────────────────
function obScore(dist: number, maxPts: number): number {
  if (dist < 0) return 0;           // OB is on wrong side
  if (dist < 20)  return maxPts;    // price within OB zone — ideal
  if (dist < 50)  return maxPts * 0.8;
  if (dist < 100) return maxPts * 0.55;
  if (dist < 200) return maxPts * 0.35;
  return maxPts * 0.1;              // too far away
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALL BUY — Bullish directional trade (buy CE)
// Ideal: Bullish BOS + SSL sweep + bullish CHOCH + price above VWAP + RSI 45-65
// ═══════════════════════════════════════════════════════════════════════════════

export function scoreCallBuy(ict: ICTContext, ind: TechIndicators): ScoredSignal {
  const factors: ScoreFactor[] = [];
  const spot = ict.currentPrice;

  // PRIMARY
  const bosBull = ict.bos.filter(b => b.direction === "BULLISH" && b.candlesSinceBreak <= 15);
  const bosS = bosBull.length
    ? (bosBull.at(-1)!.strength === "STRONG" ? 12 : bosBull.at(-1)!.strength === "MODERATE" ? 9 : 6)
    : (ict.currentBias === "BULLISH" ? 4 : 1);
  f(factors, "BOS — Break of Structure",
    bosS, 12,
    bosBull.length
      ? `Bullish BOS at ${bosBull.at(-1)!.level.toFixed(0)} confirmed (${bosBull.at(-1)!.candlesSinceBreak} candles ago) — uptrend structure intact`
      : "No recent bullish BOS — structure weak",
    "PRIMARY");

  const sslScore = ict.sslSweptRecently
    ? (ict.recentSSLSweep!.confirmed ? 12 : 8)
    : (ict.currentBias === "BULLISH" ? 4 : 1);
  f(factors, "SSL Liquidity Sweep",
    sslScore, 12,
    ict.sslSweptRecently
      ? `SSL swept at ${ict.recentSSLSweep!.level.toFixed(0)} — institutional accumulation confirmed, retail stop-hunted`
      : "No recent SSL sweep — entry may be premature",
    "PRIMARY");

  const chochBull = ict.choch.filter(c => c.direction === "BULLISH" && c.candlesSinceBreak <= 20);
  const chochS = chochBull.length
    ? (chochBull.at(-1)!.strength === "STRONG" ? 10 : 7)
    : (ict.trendDirection === "UPTREND" ? 4 : 1);
  f(factors, "Bullish CHOCH — Change of Character",
    chochS, 10,
    chochBull.length
      ? `Bullish CHOCH at ${chochBull.at(-1)!.level.toFixed(0)} — sellers exhausted, buyers absorbed supply`
      : "No bullish CHOCH detected — character not yet changed",
    "PRIMARY");

  // CONFIRM
  const bullOB = ict.nearestBullishOB;
  f(factors, "Bullish Order Block",
    bullOB ? obScore(bullOB.distanceFromPrice, 10) : 2, 10,
    bullOB
      ? `Bullish OB ${bullOB.bottom.toFixed(0)}–${bullOB.top.toFixed(0)} (${bullOB.distanceFromPrice.toFixed(0)} pts below) — demand zone holding`
      : "No unmitigated bullish OB near price",
    "CONFIRM");

  f(factors, "Bullish FVG — Fair Value Gap",
    ict.recentBullishFVG && !ict.recentBullishFVG.filled ? 9 : ict.recentBullishFVG ? 5 : 2, 9,
    ict.recentBullishFVG
      ? `Bullish FVG ${ict.recentBullishFVG.bottom.toFixed(0)}–${ict.recentBullishFVG.top.toFixed(0)} (${ict.recentBullishFVG.filled ? "filled" : "unfilled"}) — institutional imbalance`
      : "No bullish FVG detected",
    "CONFIRM");

  const vwapS = ind.vwapPosition === "ABOVE" ? 10 : ind.vwapPosition === "AT" ? 6 : 2;
  f(factors, "VWAP — Price Position",
    vwapS, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "ABOVE" ? "bullish momentum confirmed" : "weak VWAP position"}`,
    "CONFIRM");

  const rsiS = ind.rsi >= 46 && ind.rsi <= 65 ? 9 :
               ind.rsi >= 40 && ind.rsi < 46  ? 6 :
               ind.rsi > 65 && ind.rsi < 70   ? 5 : 2;
  f(factors, "RSI (14) — Momentum Zone",
    rsiS, 9,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsiSignal}${rsiS === 9 ? " (optimal momentum zone for CE buy)" : ""}`,
    "CONFIRM");

  f(factors, "EMA 20 / EMA 50 — Trend Cross",
    ind.emaSignal === "BULLISH" ? 9 : ind.emaSignal === "NEUTRAL" ? 5 : 1, 9,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BULLISH" ? ">" : "≈"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal} alignment`,
    "CONFIRM");

  f(factors, "PCR — Put-Call Ratio",
    ind.pcr > 1.25 ? 8 : ind.pcr > 1.10 ? 6 : ind.pcr > 0.95 ? 3 : 1, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr > 1.15 ? "Put writing dominant: institutions bullish" : "Neutral OI"}`,
    "CONFIRM");

  // SUPPORT
  f(factors, "India VIX",
    ind.vix < 15 ? 7 : ind.vix < 18 ? 6 : ind.vix < 22 ? 3 : 1, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 16 ? "low vol: CE premium manageable" : ind.vix < 20 ? "moderate vol" : "high vol: widen SL"}`,
    "SUPPORT");

  f(factors, "OI Change — Put Writing",
    ind.oiChangeBull > 0 ? 6 : ind.oiChangeBull > -500000 ? 4 : 2, 6,
    `Put OI change ${(ind.oiChangeBull / 1e6).toFixed(2)}M — ${ind.oiChangeBull > 0 ? "put writing active (bullish)" : "put unwinding"}`,
    "SUPPORT");

  f(factors, "ATR (14) — Volatility",
    ind.atr >= 90 && ind.atr <= 165 ? 5 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr <= 165 ? "optimal range for CE entry" : "high volatility — widen SL"}`,
    "SUPPORT");

  f(factors, "Max Pain",
    ind.maxPain < spot ? 4 : ind.maxPain < spot + 50 ? 2 : 1, 4,
    `Max Pain ${ind.maxPain.toFixed(0)} — ${ind.maxPain < spot ? "below spot: OI gravity bullish" : "above spot: overhead OI pressure"}`,
    "SUPPORT");

  return { type: "CALL_BUY", confidence: pct(factors), factors, totalScore: factors.reduce((s,f)=>s+f.score,0), maxPossibleScore: factors.reduce((s,f)=>s+f.maxScore,0) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT BUY — Bearish directional trade (buy PE)
// ═══════════════════════════════════════════════════════════════════════════════

export function scorePutBuy(ict: ICTContext, ind: TechIndicators): ScoredSignal {
  const factors: ScoreFactor[] = [];
  const spot = ict.currentPrice;

  // PRIMARY
  const bosBear = ict.bos.filter(b => b.direction === "BEARISH" && b.candlesSinceBreak <= 15);
  const bosS = bosBear.length
    ? (bosBear.at(-1)!.strength === "STRONG" ? 12 : 9)
    : (ict.currentBias === "BEARISH" ? 4 : 1);
  f(factors, "BOS — Break of Structure",
    bosS, 12,
    bosBear.length
      ? `Bearish BOS at ${bosBear.at(-1)!.level.toFixed(0)} — lower low confirmed, downtrend structure active`
      : "No recent bearish BOS",
    "PRIMARY");

  const bslScore = ict.bslSweptRecently
    ? (ict.recentBSLSweep!.confirmed ? 12 : 8)
    : (ict.currentBias === "BEARISH" ? 4 : 1);
  f(factors, "BSL Liquidity Sweep",
    bslScore, 12,
    ict.bslSweptRecently
      ? `BSL swept at ${ict.recentBSLSweep!.level.toFixed(0)} — institutional distribution confirmed, bulls trapped`
      : "No recent BSL sweep",
    "PRIMARY");

  const chochBear = ict.choch.filter(c => c.direction === "BEARISH" && c.candlesSinceBreak <= 20);
  const chochS = chochBear.length ? (chochBear.at(-1)!.strength === "STRONG" ? 10 : 7) : (ict.trendDirection === "DOWNTREND" ? 4 : 1);
  f(factors, "Bearish CHOCH — Change of Character",
    chochS, 10,
    chochBear.length
      ? `Bearish CHOCH at ${chochBear.at(-1)!.level.toFixed(0)} — buyers exhausted, sellers took control`
      : "No bearish CHOCH — structure not confirmed",
    "PRIMARY");

  // CONFIRM
  const bearOB = ict.nearestBearishOB;
  f(factors, "Bearish Order Block",
    bearOB ? obScore(bearOB.distanceFromPrice, 10) : 2, 10,
    bearOB
      ? `Bearish OB ${bearOB.bottom.toFixed(0)}–${bearOB.top.toFixed(0)} (${bearOB.distanceFromPrice.toFixed(0)} pts above) — supply zone rejecting price`
      : "No unmitigated bearish OB near price",
    "CONFIRM");

  f(factors, "Bearish FVG — Fair Value Gap",
    ict.recentBearishFVG && !ict.recentBearishFVG.filled ? 9 : ict.recentBearishFVG ? 5 : 2, 9,
    ict.recentBearishFVG
      ? `Bearish FVG ${ict.recentBearishFVG.bottom.toFixed(0)}–${ict.recentBearishFVG.top.toFixed(0)} overhead — resistance magnet`
      : "No bearish FVG overhead",
    "CONFIRM");

  const vwapS = ind.vwapPosition === "BELOW" ? 10 : ind.vwapPosition === "AT" ? 6 : 2;
  f(factors, "VWAP — Price Position",
    vwapS, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "BELOW" ? "bearish momentum confirmed" : "above VWAP: mixed"}`,
    "CONFIRM");

  const rsiS = ind.rsi >= 36 && ind.rsi <= 55 ? 9 : ind.rsi >= 30 && ind.rsi < 36 ? 6 : ind.rsi > 55 && ind.rsi < 62 ? 5 : 2;
  f(factors, "RSI (14) — Bearish Zone",
    rsiS, 9,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsiSignal}${rsiS === 9 ? " (bearish momentum zone)" : ""}`,
    "CONFIRM");

  f(factors, "EMA 20 / EMA 50 — Death Cross",
    ind.emaSignal === "BEARISH" ? 9 : ind.emaSignal === "NEUTRAL" ? 5 : 1, 9,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BEARISH" ? "<" : "≈"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal}`,
    "CONFIRM");

  f(factors, "PCR — Put-Call Ratio",
    ind.pcr < 0.78 ? 8 : ind.pcr < 0.88 ? 6 : ind.pcr < 0.98 ? 3 : 1, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr < 0.85 ? "Call writing dominant: bearish institutional bias" : "Neutral"}`,
    "CONFIRM");

  // SUPPORT
  f(factors, "India VIX",
    ind.vix > 18 ? 7 : ind.vix > 15 ? 6 : ind.vix > 13 ? 4 : 2, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix > 18 ? "elevated vol: PE buyers benefit from panic" : ind.vix > 15 ? "rising vol supports bears" : "low vol"}`,
    "SUPPORT");

  f(factors, "OI Change — Call Writing",
    ind.oiChangeBear > 0 ? 6 : 3, 6,
    `Call OI change ${(ind.oiChangeBear / 1e6).toFixed(2)}M — ${ind.oiChangeBear > 0 ? "call writing active (bearish)" : "mixed"}`,
    "SUPPORT");

  f(factors, "ATR (14) — Volatility",
    ind.atr >= 90 && ind.atr <= 175 ? 5 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — sufficient range for PE momentum trade`,
    "SUPPORT");

  f(factors, "Max Pain",
    ind.maxPain > spot ? 4 : ind.maxPain > spot - 50 ? 2 : 1, 4,
    `Max Pain ${ind.maxPain.toFixed(0)} — ${ind.maxPain > spot ? "above spot: OI gravity bearish" : "below spot: gravity mixed"}`,
    "SUPPORT");

  return { type: "PUT_BUY", confidence: pct(factors), factors, totalScore: factors.reduce((s,f)=>s+f.score,0), maxPossibleScore: factors.reduce((s,f)=>s+f.maxScore,0) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// CALL SELL — Premium selling at resistance (short CE, collect theta)
//
// PRIMARY gates (must be strongly present for 90%+):
//   1. RSI overbought > 70 at resistance   [15 pts]
//   2. BSL sweep confirmed                 [13 pts]
//   3. Bearish CHOCH at resistance         [13 pts]
// CONFIRM: OB, FVG, VWAP, OI Wall, PCR    [47 pts]
// SUPPORT: VIX, EMA, ATR, MaxPain         [24 pts]
// Total max = 112
// ═══════════════════════════════════════════════════════════════════════════════

export function scoreCallSell(ict: ICTContext, ind: TechIndicators): ScoredSignal {
  const factors: ScoreFactor[] = [];
  const spot = ict.currentPrice;

  // PRIMARY 1: RSI overbought — most critical gate
  const rsiPri =
    ind.rsi > 74 ? 15 : ind.rsi > 70 ? 13 : ind.rsi > 67 ? 8 : ind.rsi > 63 ? 4 : 1;
  f(factors, "RSI Overbought — Primary Gate",
    rsiPri, 15,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsi > 70 ? "OVERBOUGHT: peak exhaustion at resistance, prime CALL SELL entry" : ind.rsi > 67 ? "approaching overbought — partial setup" : "NOT overbought — weak CALL SELL basis"}`,
    "PRIMARY");

  // PRIMARY 2: BSL sweep — institutional stop-hunt at resistance
  const bslPri = ict.bslSweptRecently
    ? (ict.recentBSLSweep!.confirmed ? 13 : 8)
    : (ict.currentBias === "BEARISH" ? 5 : 1);
  f(factors, "BSL Sweep — Liquidity Hunt",
    bslPri, 13,
    ict.bslSweptRecently
      ? `BSL swept at ${ict.recentBSLSweep!.level.toFixed(0)} (reversal: ${ict.recentBSLSweep!.reversalSize.toFixed(0)} pts) — smart money sold into buy stops, reversal confirmed`
      : "No BSL sweep — stop hunt not complete, CALL SELL is higher-risk entry",
    "PRIMARY");

  // PRIMARY 3: Bearish CHOCH — structure failed at resistance
  const chochBear = ict.choch.filter(c => c.direction === "BEARISH" && c.candlesSinceBreak <= 12);
  const chochPri = chochBear.length
    ? (chochBear.at(-1)!.strength === "STRONG" ? 13 : chochBear.at(-1)!.strength === "MODERATE" ? 9 : 6)
    : (ict.currentBias === "BEARISH" ? 4 : 1);
  f(factors, "Bearish CHOCH at Resistance",
    chochPri, 13,
    chochBear.length
      ? `Bearish CHOCH at ${chochBear.at(-1)!.level.toFixed(0)} — lower high confirmed at resistance, momentum shifted bearish`
      : "No bearish CHOCH — structure not yet reversed",
    "PRIMARY");

  // CONFIRM 4: Bearish OB overhead
  const bearOB = ict.nearestBearishOB;
  f(factors, "Bearish Order Block at Strike",
    bearOB ? obScore(bearOB.distanceFromPrice, 11) : 2, 11,
    bearOB
      ? `Bearish OB ${bearOB.bottom.toFixed(0)}–${bearOB.top.toFixed(0)} overhead — unmitigated supply zone, ideal short call strike zone`
      : "No clear bearish OB — resistance not institutionally defined",
    "CONFIRM");

  // CONFIRM 5: Bearish FVG overhead
  f(factors, "Bearish FVG — Overhead Resistance",
    ict.recentBearishFVG && !ict.recentBearishFVG.filled ? 9 : ict.recentBearishFVG ? 4 : 2, 9,
    ict.recentBearishFVG
      ? `Bearish FVG ${ict.recentBearishFVG.bottom.toFixed(0)}–${ict.recentBearishFVG.top.toFixed(0)} — unfilled imbalance caps upside, protects short call`
      : "No bearish FVG — upside resistance less defined",
    "CONFIRM");

  // CONFIRM 6: VWAP — price should be slightly above (overextension)
  const vwapCS = ind.vwapPosition === "ABOVE" ? 10 : ind.vwapPosition === "AT" ? 6 : 2;
  f(factors, "VWAP Overextension",
    vwapCS, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "ABOVE" ? "overbought extension above VWAP: mean-reversion favors CALL SELL" : ind.vwapPosition === "AT" ? "at VWAP: marginal setup" : "BELOW VWAP: not a CALL SELL environment"}`,
    "CONFIRM");

  // CONFIRM 7: Call OI wall at resistance
  const callOIwall = ind.callOI > ind.putOI * 1.20 ? 9 : ind.callOI > ind.putOI * 1.08 ? 7 : ind.callOI > ind.putOI ? 4 : 1;
  f(factors, "Call OI Wall at Resistance",
    callOIwall, 9,
    `Call OI ${(ind.callOI/1e6).toFixed(1)}M vs Put OI ${(ind.putOI/1e6).toFixed(1)}M — ${ind.callOI > ind.putOI ? "heavy call OI: institutional resistance wall at strike" : "balanced OI — resistance less defined"}`,
    "CONFIRM");

  // CONFIRM 8: PCR contrarian (retail call-buying frenzy)
  const pcrCS = ind.pcr < 0.74 ? 8 : ind.pcr < 0.82 ? 7 : ind.pcr < 0.90 ? 4 : 1;
  f(factors, "PCR — Contrarian Signal",
    pcrCS, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr < 0.85 ? "call-buying panic: retail is long CE, smart money on the sell side" : "PCR not extreme — contrarian edge limited"}`,
    "CONFIRM");

  // SUPPORT 9: VIX optimal for premium selling
  const vixCS = ind.vix >= 12 && ind.vix < 15 ? 7 : ind.vix >= 15 && ind.vix < 18 ? 6 : ind.vix >= 18 && ind.vix < 22 ? 3 : 1;
  f(factors, "India VIX — Premium Collection",
    vixCS, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 15 ? "low-moderate VIX: theta decay accelerated, risk manageable" : ind.vix < 18 ? "acceptable for selling" : "high VIX: elevated risk — reduce size"}`,
    "SUPPORT");

  // SUPPORT 10: EMA death cross
  f(factors, "EMA 20/50 — Death Cross",
    ind.emaSignal === "BEARISH" ? 7 : ind.emaSignal === "NEUTRAL" ? 4 : 1, 7,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BEARISH" ? "<" : "≈"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal === "BEARISH" ? "death cross: higher-TF bearish context confirms CALL SELL" : "no bearish cross"}`,
    "SUPPORT");

  // SUPPORT 11: ATR manageable for SL on short call
  f(factors, "ATR (14) — SL Sizing",
    ind.atr >= 80 && ind.atr < 150 ? 5 : ind.atr < 80 ? 2 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr < 150 ? "manageable: SL on short call within tolerance" : "wide ATR: tighten position size"}`,
    "SUPPORT");

  // SUPPORT 12: Max Pain gravity (below current price)
  const mpCS = ind.maxPain < spot - 40 ? 5 : ind.maxPain < spot ? 3 : 1;
  f(factors, "Max Pain — OI Gravity",
    mpCS, 5,
    `Max Pain ${ind.maxPain.toFixed(0)} — ${ind.maxPain < spot ? `${(spot - ind.maxPain).toFixed(0)} pts below spot: OI gravity pulls price down, protects short call` : "max pain near or above spot: gravity mixed"}`,
    "SUPPORT");

  return { type: "CALL_SELL", confidence: pct(factors), factors, totalScore: factors.reduce((s,f)=>s+f.score,0), maxPossibleScore: factors.reduce((s,f)=>s+f.maxScore,0) };
}

// ═══════════════════════════════════════════════════════════════════════════════
// PUT SELL — Premium selling at support (short PE, collect theta)
//
// PRIMARY gates:
//   1. RSI oversold < 30 at support        [15 pts]
//   2. SSL sweep confirmed                  [13 pts]
//   3. Bullish CHOCH at support             [13 pts]
// Total max = 112
// ═══════════════════════════════════════════════════════════════════════════════

export function scorePutSell(ict: ICTContext, ind: TechIndicators): ScoredSignal {
  const factors: ScoreFactor[] = [];
  const spot = ict.currentPrice;

  // PRIMARY 1: RSI oversold — most critical gate
  const rsiPri =
    ind.rsi < 25 ? 15 : ind.rsi < 30 ? 13 : ind.rsi < 33 ? 8 : ind.rsi < 37 ? 4 : 1;
  f(factors, "RSI Oversold — Primary Gate",
    rsiPri, 15,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsi < 30 ? "OVERSOLD: capitulation at support, prime PUT SELL entry" : ind.rsi < 35 ? "approaching oversold — partial setup" : "NOT oversold — weak PUT SELL basis"}`,
    "PRIMARY");

  // PRIMARY 2: SSL sweep — institutional stop-hunt below support
  const sslPri = ict.sslSweptRecently
    ? (ict.recentSSLSweep!.confirmed ? 13 : 8)
    : (ict.currentBias === "BULLISH" ? 5 : 1);
  f(factors, "SSL Sweep — Liquidity Hunt",
    sslPri, 13,
    ict.sslSweptRecently
      ? `SSL swept at ${ict.recentSSLSweep!.level.toFixed(0)} (reversal: ${ict.recentSSLSweep!.reversalSize.toFixed(0)} pts) — smart money bought sell stops, bounce confirmed`
      : "No SSL sweep — stop hunt not complete, PUT SELL is higher-risk entry",
    "PRIMARY");

  // PRIMARY 3: Bullish CHOCH — price found support and reversed
  const chochBull = ict.choch.filter(c => c.direction === "BULLISH" && c.candlesSinceBreak <= 12);
  const chochPri = chochBull.length
    ? (chochBull.at(-1)!.strength === "STRONG" ? 13 : chochBull.at(-1)!.strength === "MODERATE" ? 9 : 6)
    : (ict.currentBias === "BULLISH" ? 4 : 1);
  f(factors, "Bullish CHOCH at Support",
    chochPri, 13,
    chochBull.length
      ? `Bullish CHOCH at ${chochBull.at(-1)!.level.toFixed(0)} — higher low forming at support, sellers exhausted`
      : "No bullish CHOCH — support not yet confirmed",
    "PRIMARY");

  // CONFIRM 4: Bullish OB below
  const bullOB = ict.nearestBullishOB;
  f(factors, "Bullish Order Block at Strike",
    bullOB ? obScore(bullOB.distanceFromPrice, 11) : 2, 11,
    bullOB
      ? `Bullish OB ${bullOB.bottom.toFixed(0)}–${bullOB.top.toFixed(0)} — unmitigated demand zone, ideal short put strike zone`
      : "No clear bullish OB — support not institutionally defined",
    "CONFIRM");

  // CONFIRM 5: Bullish FVG below
  f(factors, "Bullish FVG — Downside Cushion",
    ict.recentBullishFVG && !ict.recentBullishFVG.filled ? 9 : ict.recentBullishFVG ? 4 : 2, 9,
    ict.recentBullishFVG
      ? `Bullish FVG ${ict.recentBullishFVG.bottom.toFixed(0)}–${ict.recentBullishFVG.top.toFixed(0)} — imbalance below acts as floor, protects short put`
      : "No bullish FVG — downside cushion absent",
    "CONFIRM");

  // CONFIRM 6: VWAP — price below (panic dip)
  const vwapPS = ind.vwapPosition === "BELOW" ? 10 : ind.vwapPosition === "AT" ? 6 : 2;
  f(factors, "VWAP Panic Dip",
    vwapPS, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "BELOW" ? "panic dip below VWAP: oversold extension, mean-reversion favors PUT SELL" : "above VWAP: not a PUT SELL environment"}`,
    "CONFIRM");

  // CONFIRM 7: Put OI wall at support
  const putOIwall = ind.putOI > ind.callOI * 1.20 ? 9 : ind.putOI > ind.callOI * 1.08 ? 7 : ind.putOI > ind.callOI ? 4 : 1;
  f(factors, "Put OI Wall at Support",
    putOIwall, 9,
    `Put OI ${(ind.putOI/1e6).toFixed(1)}M vs Call OI ${(ind.callOI/1e6).toFixed(1)}M — ${ind.putOI > ind.callOI ? "heavy put OI: institutional writers defending support, expiry pin likely" : "balanced — support less defined"}`,
    "CONFIRM");

  // CONFIRM 8: PCR contrarian (retail put-buying panic)
  const pcrPS = ind.pcr > 1.40 ? 8 : ind.pcr > 1.28 ? 7 : ind.pcr > 1.14 ? 4 : 1;
  f(factors, "PCR — Contrarian Signal",
    pcrPS, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr > 1.25 ? "put-buying panic: retail loaded PE, smart money selling puts against them" : "PCR not extreme — contrarian edge limited"}`,
    "CONFIRM");

  // SUPPORT 9: VIX optimal for premium selling
  const vixPS = ind.vix >= 12 && ind.vix < 15 ? 7 : ind.vix >= 15 && ind.vix < 18 ? 6 : ind.vix >= 18 && ind.vix < 22 ? 3 : 1;
  f(factors, "India VIX — Premium Collection",
    vixPS, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 15 ? "low-moderate VIX: theta decay optimal for PUT SELL" : ind.vix < 18 ? "acceptable for selling" : "high VIX: may spike further against short put — reduce size"}`,
    "SUPPORT");

  // SUPPORT 10: EMA golden structure
  f(factors, "EMA 20/50 — Golden Structure",
    ind.emaSignal === "BULLISH" ? 7 : ind.emaSignal === "NEUTRAL" ? 4 : 1, 7,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BULLISH" ? ">" : "≈"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal === "BULLISH" ? "golden structure: higher-TF bullish bias validates PUT SELL" : "no bullish cross"}`,
    "SUPPORT");

  // SUPPORT 11: ATR manageable
  f(factors, "ATR (14) — SL Sizing",
    ind.atr >= 80 && ind.atr < 150 ? 5 : ind.atr < 80 ? 2 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr < 150 ? "manageable: SL on short put within risk tolerance" : "wide ATR: reduce position size"}`,
    "SUPPORT");

  // SUPPORT 12: Max Pain gravity (above current price)
  const mpPS = ind.maxPain > spot + 40 ? 5 : ind.maxPain > spot ? 3 : 1;
  f(factors, "Max Pain — OI Gravity",
    mpPS, 5,
    `Max Pain ${ind.maxPain.toFixed(0)} — ${ind.maxPain > spot ? `${(ind.maxPain - spot).toFixed(0)} pts above spot: OI gravity pulls price up, protects short put` : "max pain below spot: gravity mixed"}`,
    "SUPPORT");

  return { type: "PUT_SELL", confidence: pct(factors), factors, totalScore: factors.reduce((s,f)=>s+f.score,0), maxPossibleScore: factors.reduce((s,f)=>s+f.maxScore,0) };
}

// ── Score all four signal types ───────────────────────────────────────────────

export function scoreAll(ict: ICTContext, ind: TechIndicators): ScoredSignal[] {
  return [
    scoreCallBuy(ict, ind),
    scorePutBuy(ict, ind),
    scoreCallSell(ict, ind),
    scorePutSell(ict, ind),
  ].sort((a, b) => b.confidence - a.confidence);
}
