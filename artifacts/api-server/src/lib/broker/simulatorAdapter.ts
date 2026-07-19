/**
 * Simulator Broker Adapter
 *
 * Produces regime-based, ICT-compatible OHLCV candle sequences so the
 * signal engine runs identically to live Kite mode. No random noise —
 * each regime generates a deterministic pattern that the ICT engine
 * will correctly classify (BOS, CHOCH, OB, FVG, liquidity sweeps).
 *
 * Regime rotates every 15 minutes via a time slot, ensuring a different
 * signal type fires each window for demonstration purposes.
 */

import type { BrokerAdapter } from "./adapter.js";
import type { BrokerMarketData, OHLCV, OptionStrike, OptionChainData } from "./types.js";

// ── Regime ────────────────────────────────────────────────────────────────────

type Regime = "CALL_BUY" | "CALL_SELL" | "PUT_BUY" | "PUT_SELL" | "BULL_TREND" | "BEAR_TREND";

function getRegime(): Regime {
  const slot = Math.floor(Date.now() / (15 * 60_000));
  const seq: Regime[] = ["CALL_BUY", "BULL_TREND", "CALL_SELL", "PUT_BUY", "BEAR_TREND", "PUT_SELL"];
  return seq[slot % seq.length];
}

// ── Base state ────────────────────────────────────────────────────────────────

let baseNifty = 24580.35;
let lastDrift  = Date.now();

function driftPrice(v: number, pct = 0.0008): number {
  return v + (Math.random() - 0.48) * v * pct;
}
function r2(n: number) { return Math.round(n * 100) / 100; }
function r0(n: number) { return Math.round(n); }
function jitter(range: number) { return (Math.random() - 0.5) * range; }

function getSpot(): number {
  if ((Date.now() - lastDrift) / 1000 > 2) {
    baseNifty = driftPrice(baseNifty);
    lastDrift = Date.now();
  }
  return r2(baseNifty);
}

// ── Candle generation ─────────────────────────────────────────────────────────

/**
 * Generates a realistic OHLCV candle sequence tuned for each regime.
 *
 * Design:
 *   Phase 1 (candles 0-30): background market structure
 *   Phase 2 (candles 31-40): key event (sweep, impulse)
 *   Phase 3 (candles 41-55): CHOCH / BOS confirmation
 *   Phase 4 (candles 56-80): current market state
 *
 * The ICT engine will detect swings, BOS, CHOCH, OB, FVG, sweeps
 * from these candles algorithmically.
 */
function generateCandles(regime: Regime, basePrice: number, count = 80): OHLCV[] {
  const candles: OHLCV[] = [];
  let price = basePrice;
  const now = Date.now();
  const candleMs = 1_000; // 1 Second
 
  // Candle builder helper
  const makeCandle = (idx: number, open: number, move: number, wick = 0.4): OHLCV => {
    const close = r2(open + move);
    const body = Math.abs(move);
    const highExtra = body * wick + Math.abs(jitter(body * 0.3));
    const lowExtra  = body * wick + Math.abs(jitter(body * 0.3));
    return {
      time: new Date(now - (count - idx) * candleMs).toISOString(),
      open: r2(open),
      high: r2(Math.max(open, close) + highExtra),
      low:  r2(Math.min(open, close) - lowExtra),
      close,
      volume: r0(1_200_000 + Math.random() * 800_000),
    };
  };

  switch (regime) {
    // ── CALL BUY: SSL sweep → bullish CHOCH → BOS bullish → current at OB ─
    case "CALL_BUY":
    case "BULL_TREND": {
      // Phase 1: mild downtrend (establishing lower lows for SSL)
      for (let i = 0; i < 25; i++) {
        const move = i % 4 === 0 ? jitter(40) + 20 : -(20 + jitter(15));  // mostly down, pullback every 4th
        const c = makeCandle(i, price, move);
        candles.push(c); price = c.close;
      }
      const sslLevel = price; // SSL sits below this area

      // Phase 2: SSL sweep — wick far below then close above
      const sweepCandle = makeCandle(25, price, -(80 + jitter(20)), 0.1);
      sweepCandle.low = r2(sslLevel - 90 - Math.abs(jitter(20)));  // deep wick
      sweepCandle.close = r2(sslLevel + 10);  // close back above
      sweepCandle.high  = r2(Math.max(sweepCandle.open, sweepCandle.close) + 15);
      candles.push(sweepCandle); price = sweepCandle.close;

      // Phase 3: bullish CHOCH — strong up close above prior swing high
      const priorSwingHigh = Math.max(...candles.slice(15, 25).map(c => c.high));
      for (let i = 26; i < 35; i++) {
        const move = 20 + jitter(10);
        const c = makeCandle(i, price, move, 0.2);
        candles.push(c); price = c.close;
      }
      // Force CHOCH candle above prior swing high
      const chochC = makeCandle(35, price, priorSwingHigh - price + 30, 0.2);
      candles.push(chochC); price = chochC.close;

      // Phase 4: uptrend — HH and HL pattern, RSI rising 50-65
      for (let i = 36; i < count; i++) {
        const wave = Math.sin((i - 36) * 0.7) * 25;
        const move = 18 + wave + jitter(10);
        const c = makeCandle(i, price, move, 0.3);
        candles.push(c); price = c.close;
      }
      break;
    }

    // ── PUT BUY: BSL sweep → bearish CHOCH → BOS bearish → current ─────────
    case "PUT_BUY":
    case "BEAR_TREND": {
      // Phase 1: mild uptrend (establishing higher highs for BSL)
      for (let i = 0; i < 25; i++) {
        const move = i % 4 === 0 ? jitter(30) - 15 : 20 + jitter(15);
        const c = makeCandle(i, price, move);
        candles.push(c); price = c.close;
      }
      const bslLevel = price;

      // Phase 2: BSL sweep — wick far above then close below
      const sweepC = makeCandle(25, price, 80 + jitter(20), 0.1);
      sweepC.high  = r2(bslLevel + 90 + Math.abs(jitter(20)));
      sweepC.close = r2(bslLevel - 10);
      sweepC.low   = r2(Math.min(sweepC.open, sweepC.close) - 15);
      candles.push(sweepC); price = sweepC.close;

      // Phase 3: bearish CHOCH — strong down close below prior swing low
      const priorSwingLow = Math.min(...candles.slice(15, 25).map(c => c.low));
      for (let i = 26; i < 35; i++) {
        const move = -(20 + jitter(10));
        const c = makeCandle(i, price, move, 0.2);
        candles.push(c); price = c.close;
      }
      const chochC = makeCandle(35, price, priorSwingLow - price - 30, 0.2);
      candles.push(chochC); price = chochC.close;

      // Phase 4: downtrend — LL and LH pattern, RSI falling 35-50
      for (let i = 36; i < count; i++) {
        const wave = Math.sin((i - 36) * 0.7) * 20;
        const move = -(18 + wave + jitter(10));
        const c = makeCandle(i, price, move, 0.3);
        candles.push(c); price = c.close;
      }
      break;
    }

    // ── CALL SELL: uptrend → BSL sweep → bearish CHOCH at resistance ────────
    case "CALL_SELL": {
      // Phase 1: strong uptrend (RSI rises to 70+)
      for (let i = 0; i < 30; i++) {
        const isCorrection = i % 5 === 4;
        const move = isCorrection ? -(15 + jitter(8)) : (25 + jitter(12));
        const c = makeCandle(i, price, move, 0.2);
        candles.push(c); price = c.close;
      }
      const bslLevel = price; // BSL sits above this

      // Phase 2: BSL sweep — big wick above, close below (bull trap)
      const sweepC = makeCandle(30, price, -(5 + jitter(10)), 0.1);
      sweepC.high  = r2(bslLevel + 70 + Math.abs(jitter(15)));  // wick into BSL
      sweepC.close = r2(bslLevel - 5);   // close back below — SWEEP CONFIRMED
      sweepC.low   = r2(price - 10);
      candles.push(sweepC); price = sweepC.close;

      // Phase 3: bearish CHOCH — close below prior swing low, RSI still 70+
      const priorSwingLow = Math.min(...candles.slice(20, 30).map(c => c.low));
      for (let i = 31; i < 38; i++) {
        const move = -(18 + jitter(8));
        const c = makeCandle(i, price, move, 0.2);
        candles.push(c); price = c.close;
      }
      const chochC = makeCandle(38, price, priorSwingLow - price - 20, 0.15);
      candles.push(chochC); price = chochC.close;

      // Phase 4: consolidation / slight recovery (CALL SELL zone) — RSI elevated
      for (let i = 39; i < count; i++) {
        // Choppy sideways-to-slightly-down — RSI stays elevated
        const move = jitter(15) + (i % 3 === 0 ? 10 : -5);
        const c = makeCandle(i, price, move, 0.35);
        candles.push(c); price = c.close;
      }
      break;
    }

    // ── PUT SELL: downtrend → SSL sweep → bullish CHOCH at support ───────────
    case "PUT_SELL": {
      // Phase 1: strong downtrend (RSI falls to 30-)
      for (let i = 0; i < 30; i++) {
        const isCorrection = i % 5 === 4;
        const move = isCorrection ? (15 + jitter(8)) : -(25 + jitter(12));
        const c = makeCandle(i, price, move, 0.2);
        candles.push(c); price = c.close;
      }
      const sslLevel = price;

      // Phase 2: SSL sweep — big wick below, close above (bear trap)
      const sweepC = makeCandle(30, price, (5 + jitter(10)), 0.1);
      sweepC.low   = r2(sslLevel - 70 - Math.abs(jitter(15)));  // wick into SSL
      sweepC.close = r2(sslLevel + 5);   // close back above — SWEEP CONFIRMED
      sweepC.high  = r2(price + 10);
      candles.push(sweepC); price = sweepC.close;

      // Phase 3: bullish CHOCH — close above prior swing high, RSI still 30-
      const priorSwingHigh = Math.max(...candles.slice(20, 30).map(c => c.high));
      for (let i = 31; i < 38; i++) {
        const move = 18 + jitter(8);
        const c = makeCandle(i, price, move, 0.2);
        candles.push(c); price = c.close;
      }
      const chochC = makeCandle(38, price, priorSwingHigh - price + 20, 0.15);
      candles.push(chochC); price = chochC.close;

      // Phase 4: consolidation / slight pullback (PUT SELL zone) — RSI oversold
      for (let i = 39; i < count; i++) {
        const move = jitter(15) + (i % 3 === 0 ? -10 : 5);
        const c = makeCandle(i, price, move, 0.35);
        candles.push(c); price = c.close;
      }
      break;
    }
  }

  return candles;
}

// ── Option chain generation ───────────────────────────────────────────────────

function generateOptionChain(spot: number, regime: Regime): OptionChainData {
  const atmStrike = Math.round(spot / 50) * 50;

  // Regime-specific option metrics
  const configs: Record<Regime, { pcr: number; vix: number; callOIBias: number }> = {
    CALL_BUY:   { pcr: 1.38, vix: 14.5, callOIBias: 0.7 },  // put writing dominant
    BULL_TREND: { pcr: 1.25, vix: 15.0, callOIBias: 0.75 },
    CALL_SELL:  { pcr: 0.78, vix: 13.5, callOIBias: 1.4  },  // call writing dominant
    PUT_BUY:    { pcr: 0.80, vix: 20.0, callOIBias: 1.3  },  // call writing (bearish)
    BEAR_TREND: { pcr: 0.85, vix: 18.5, callOIBias: 1.2  },
    PUT_SELL:   { pcr: 1.45, vix: 13.0, callOIBias: 0.65 },  // put writing dominant
  };
  const cfg = configs[regime];

  const strikes: OptionStrike[] = [];
  let totalCallOI = 0, totalPutOI = 0;

  for (let i = -10; i <= 10; i++) {
    const strike = atmStrike + i * 50;
    const isAtm = i === 0;
    const m = Math.abs(i);
    const callItm = i < 0, putItm = i > 0;

    const callLtp = callItm
      ? r2(spot - strike + 15 + Math.random() * 10)
      : r2(Math.max(1, 80 - m * 10 + jitter(15)));
    const putLtp = putItm
      ? r2(strike - spot + 15 + Math.random() * 10)
      : r2(Math.max(1, 80 - m * 10 + jitter(15)));

    // OI peaks at ATM, biased by regime
    const atmCallOI = 8_000_000 * cfg.callOIBias;
    const atmPutOI  = 8_000_000 / cfg.callOIBias;
    const callOI = r0((isAtm ? atmCallOI : atmCallOI * 0.4 * Math.exp(-m * 0.3)) + jitter(200_000));
    const putOI  = r0((isAtm ? atmPutOI  : atmPutOI  * 0.4 * Math.exp(-m * 0.3)) + jitter(200_000));
    totalCallOI += callOI; totalPutOI += putOI;

    const iv = r2(cfg.vix + m * 0.8 + Math.random() * 2);

    const opt = (ltp: number, oi: number, sign: number, itm: boolean) => ({
      tradingsymbol: `NIFTY${strike}${sign > 0 ? "CE" : "PE"}`,
      ltp, iv,
      delta: r2(itm ? sign * (0.7 + Math.random() * 0.2) : sign * (0.5 - m * 0.08 + Math.random() * 0.05)),
      gamma: r2(isAtm ? 0.004 : Math.max(0, 0.003 - m * 0.0002)),
      theta: r2(-(isAtm ? 12 : 8 - m * 0.4) - Math.random() * 2),
      vega:  r2(isAtm ? 45 : Math.max(5, 38 - m * 3.5 + Math.random() * 4)),
      oi, oiChange: r0(jitter(oi * 0.08)), volume: r0(oi * 0.12 * Math.random()),
      bidPrice: r2(ltp - 0.5), askPrice: r2(ltp + 0.5),
    });

    strikes.push({
      strike,
      call: opt(callLtp, callOI, 1,  callItm),
      put:  opt(putLtp,  putOI,  -1, putItm),
    });
  }

  const pcr = r2(totalPutOI / (totalCallOI || 1));
  const maxPain = calcMaxPainLocal(strikes, atmStrike);
  const atmIV = strikes.find(s => s.strike === atmStrike)?.call.iv ?? cfg.vix;
  const expiry = nextThursday();

  return { expiry, spotPrice: spot, atmStrike, atmIV, strikes, totalCallOI, totalPutOI, pcr, maxPain };
}

function calcMaxPainLocal(strikes: OptionStrike[], fallback: number): number {
  let min = Infinity, result = fallback;
  for (const { strike: exp } of strikes) {
    let loss = 0;
    for (const { strike, call, put } of strikes) {
      loss += Math.max(exp - strike, 0) * call.oi + Math.max(strike - exp, 0) * put.oi;
    }
    if (loss < min) { min = loss; result = exp; }
  }
  return result;
}

function nextThursday(): string {
  const d = new Date();
  while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ── Adapter implementation ────────────────────────────────────────────────────

export class SimulatorAdapter implements BrokerAdapter {
  readonly name     = "Market Simulator";
  readonly source   = "simulator" as const;

  async isAvailable(): Promise<boolean> { return true; }

  async getMarketData(): Promise<BrokerMarketData> {
    const regime = getRegime();
    const spot   = getSpot();

    const candles15m = generateCandles(regime, spot * 0.97, 80);
    // 5m candles: use last portion of 15m candles with finer granularity (simplified)
    const candles5m  = generateCandles(regime, candles15m.at(-1)?.close ?? spot, 80);

    const optionChain = generateOptionChain(spot, regime);

    // VIX from option chain regime
    const vixMap: Record<Regime, number> = {
      CALL_BUY: 14.5, BULL_TREND: 15.0, CALL_SELL: 13.5,
      PUT_BUY: 20.0,  BEAR_TREND: 18.5, PUT_SELL: 13.0,
    };
    const indiaVix = r2(vixMap[regime] + jitter(1.5));

    const open  = r2(spot - jitter(80));
    const high  = r2(Math.max(spot, open) + Math.random() * 60);
    const low   = r2(Math.min(spot, open) - Math.random() * 60);
    const prev  = r2(spot - jitter(60));

    return {
      spot: {
        ltp: spot, open, high, low, close: r2(spot - jitter(5)),
        volume: r0(125_000_000 + Math.random() * 50_000_000),
        change: r2(spot - prev),
        changePercent: r2(((spot - prev) / prev) * 100),
      },
      candles15m,
      candles5m,
      optionChain,
      indiaVix,
      timestamp: new Date().toISOString(),
      source: "simulator",
    };
  }
}
