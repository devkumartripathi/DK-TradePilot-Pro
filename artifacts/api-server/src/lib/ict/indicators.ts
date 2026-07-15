/**
 * Technical indicator computation from OHLCV candle arrays.
 * Pure functions — no side effects, fully testable.
 *
 * ZERODHA KITE SWAP: pass kite historical data candles directly.
 */

import type { OHLCV } from "../broker/types.js";

// ── RSI (14) — Wilder smoothing ─────────────────────────────────────────────

export function calcRsi(candles: OHLCV[], period = 14): number {
  if (candles.length < period + 1) return 50;
  const closes = candles.map(c => c.close);
  let gains = 0, losses = 0;

  // Seed
  for (let i = 1; i <= period; i++) {
    const d = closes[i] - closes[i - 1];
    if (d > 0) gains += d; else losses -= d;
  }
  let avgGain = gains / period;
  let avgLoss = losses / period;

  // Wilder smoothing for remaining candles
  for (let i = period + 1; i < closes.length; i++) {
    const d = closes[i] - closes[i - 1];
    avgGain = (avgGain * (period - 1) + (d > 0 ? d : 0)) / period;
    avgLoss = (avgLoss * (period - 1) + (d < 0 ? -d : 0)) / period;
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Math.round((100 - 100 / (1 + rs)) * 100) / 100;
}

// ── EMA ─────────────────────────────────────────────────────────────────────

export function calcEma(candles: OHLCV[], period: number): number {
  if (candles.length < period) return candles.at(-1)?.close ?? 0;
  const k = 2 / (period + 1);
  const closes = candles.map(c => c.close);
  let ema = closes.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < closes.length; i++) {
    ema = closes[i] * k + ema * (1 - k);
  }
  return Math.round(ema * 100) / 100;
}

// ── ATR (14) — Wilder smoothing ─────────────────────────────────────────────

export function calcAtr(candles: OHLCV[], period = 14): number {
  if (candles.length < period + 1) return 100;
  const trs: number[] = [];
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    trs.push(Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close)));
  }
  let atr = trs.slice(0, period).reduce((s, v) => s + v, 0) / period;
  for (let i = period; i < trs.length; i++) {
    atr = (atr * (period - 1) + trs[i]) / period;
  }
  return Math.round(atr * 100) / 100;
}

// ── VWAP (intraday — resets at session start) ───────────────────────────────

export function calcVwap(candles: OHLCV[]): number {
  // Treat all candles as intraday (caller should pass same-day candles only)
  let cumPV = 0, cumVol = 0;
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3;
    cumPV += tp * c.volume;
    cumVol += c.volume;
  }
  if (cumVol === 0) return candles.at(-1)?.close ?? 0;
  return Math.round((cumPV / cumVol) * 100) / 100;
}

// ── ADX (14) ─────────────────────────────────────────────────────────────────

export function calcAdx(candles: OHLCV[], period = 14): number {
  if (candles.length < period * 2) return 25;
  const dxs: number[] = [];
  let prevAtrSmooth = 0, prevDmPlusSmooth = 0, prevDmMinusSmooth = 0;

  for (let i = 1; i < candles.length; i++) {
    const c = candles[i], p = candles[i - 1];
    const tr = Math.max(c.high - c.low, Math.abs(c.high - p.close), Math.abs(c.low - p.close));
    const dmPlus = c.high - p.high > p.low - c.low ? Math.max(c.high - p.high, 0) : 0;
    const dmMinus = p.low - c.low > c.high - p.high ? Math.max(p.low - c.low, 0) : 0;

    if (i < period) {
      prevAtrSmooth += tr;
      prevDmPlusSmooth += dmPlus;
      prevDmMinusSmooth += dmMinus;
    } else if (i === period) {
      prevAtrSmooth = prevAtrSmooth + tr;
      prevDmPlusSmooth = prevDmPlusSmooth + dmPlus;
      prevDmMinusSmooth = prevDmMinusSmooth + dmMinus;
    } else {
      prevAtrSmooth = prevAtrSmooth - prevAtrSmooth / period + tr;
      prevDmPlusSmooth = prevDmPlusSmooth - prevDmPlusSmooth / period + dmPlus;
      prevDmMinusSmooth = prevDmMinusSmooth - prevDmMinusSmooth / period + dmMinus;
    }

    if (i >= period && prevAtrSmooth > 0) {
      const diPlus = (prevDmPlusSmooth / prevAtrSmooth) * 100;
      const diMinus = (prevDmMinusSmooth / prevAtrSmooth) * 100;
      const sum = diPlus + diMinus;
      if (sum > 0) dxs.push(Math.abs(diPlus - diMinus) / sum * 100);
    }
  }

  if (dxs.length === 0) return 25;
  const recent = dxs.slice(-period);
  return Math.round(recent.reduce((s, v) => s + v, 0) / recent.length * 100) / 100;
}

// ── Helper — filter today's candles for VWAP ────────────────────────────────

export function todayCandles(candles: OHLCV[]): OHLCV[] {
  const today = new Date().toISOString().slice(0, 10);
  const todayCandles = candles.filter(c => c.time.slice(0, 10) === today);
  return todayCandles.length > 0 ? todayCandles : candles; // fallback to all
}
