/**
 * Market data generators for dashboard endpoints.
 * Used by /market, /smc, /options routes.
 *
 * Signal generation has moved to:
 *   lib/signalEngine.ts           — orchestrator
 *   lib/broker/                   — live data (Kite) + simulator adapters
 *   lib/ict/                      — ICT structural analysis
 *   lib/scoring/engine.ts         — confidence scoring
 */

// ── Price state ───────────────────────────────────────────────────────────────

let baseNifty = 24580.35;
let lastTick  = Date.now();

function drift(v: number, pct = 0.001) { return v + (Math.random() - 0.48) * v * pct; }
function r2(n: number) { return Math.round(n * 100) / 100; }
function r0(n: number) { return Math.round(n); }
function rand(lo: number, hi: number) { return lo + Math.random() * (hi - lo); }

export function getNiftyLtp(): number {
  if ((Date.now() - lastTick) / 1000 > 2) { baseNifty = drift(baseNifty); lastTick = Date.now(); }
  return r2(baseNifty);
}

// ── Nifty market data ─────────────────────────────────────────────────────────

export function generateNiftyData() {
  const ltp       = getNiftyLtp();
  const open      = r2(ltp - (Math.random() - 0.45) * 120);
  const dayHigh   = r2(Math.max(ltp, open) + Math.random() * 60);
  const dayLow    = r2(Math.min(ltp, open) - Math.random() * 60);
  const prevClose = r2(ltp - (Math.random() - 0.45) * 80);
  const change    = r2(ltp - prevClose);
  const now = new Date();
  const h   = now.getHours();
  const marketStatus = h >= 9 && h < 16 ? "OPEN"
    : h === 9 && now.getMinutes() < 15 ? "PRE_OPEN"
    : h >= 16 ? "POST_CLOSE" : "CLOSED";

  return {
    ltp, open, high: dayHigh, low: dayLow, close: r2(ltp - (Math.random() - 0.5) * 5),
    change, changePercent: r2((change / prevClose) * 100),
    volume: r0(125e6 + Math.random() * 50e6),
    dayHigh, dayLow, weekHigh52: 24968.70, weekLow52: 19426.35,
    marketStatus, timestamp: new Date().toISOString(),
    trend: change > 0 ? "BULLISH" : change < 0 ? "BEARISH" : "NEUTRAL",
  };
}

// ── Candles ───────────────────────────────────────────────────────────────────

export function generateCandles(timeframe: string, limit: number) {
  const ms: Record<string, number> = {
  "1m": 60e3,
  "3m": 180e3,
  "5m": 300e3,
  "10m": 600e3,
  "15m": 900e3,
  "30m": 1800e3,
  "45m": 2700e3,
  "1h": 3600e3,
  "2h": 7200e3,
  "4h": 14400e3,
  "1d": 86400e3,
  "1w": 604800e3,
  "1M": 2592000000,
  "3M": 7776000000
};
  const interval = ms[timeframe] ?? 60e3;
  let price = baseNifty;
  const now = Date.now();
  return Array.from({ length: limit + 1 }, (_, idx) => {
    const time  = new Date(now - (limit - idx) * interval);
    const open  = r2(price);
    const move  = (Math.random() - 0.48) * price * 0.004;
    const close = r2(open + move);
    const extra = Math.random() * Math.abs(move) * 0.5;
    price = close;
    return {
      time: time.toISOString(), open,
      high: r2(Math.max(open, close) + extra), low: r2(Math.min(open, close) - extra),
      close, volume: r0(800e3 + Math.random() * 1.2e6),
    };
  });
}

// ── VWAP ─────────────────────────────────────────────────────────────────────

export function generateVwap() {
  const ltp  = getNiftyLtp();
  const vwap = r2(ltp - (Math.random() - 0.5) * 40);
  const std  = r2(30 + Math.random() * 20);
  return {
    vwap, upperBand1: r2(vwap + std), upperBand2: r2(vwap + std * 2),
    lowerBand1: r2(vwap - std), lowerBand2: r2(vwap - std * 2),
    currentPrice: ltp,
    priceVsVwap: ltp > vwap + 10 ? "ABOVE" : ltp < vwap - 10 ? "BELOW" : "AT",
    vwapTrend: Math.random() > 0.5 ? "RISING" : "FALLING",
  };
}

// ── SMC Analysis ──────────────────────────────────────────────────────────────

export function generateSmcAnalysis() {
  const ltp  = getNiftyLtp();
  const bull = Math.random() > 0.4;
  const swingHigh = r2(ltp + 80 + Math.random() * 120);
  const swingLow  = r2(ltp - 80 - Math.random() * 120);
  const phases = ["ACCUMULATION","DISTRIBUTION","MARKUP","MARKDOWN","CONSOLIDATION"] as const;
  return {
    marketStructure: {
      trend: bull ? "UPTREND" as const : Math.random() > 0.5 ? "DOWNTREND" as const : "SIDEWAYS" as const,
      higherHigh: bull, higherLow: bull, lowerHigh: !bull, lowerLow: !bull,
      currentSwingHigh: swingHigh, currentSwingLow: swingLow,
      phase: phases[Math.floor(Math.random() * phases.length)],
    },
    bos: [
      { type: "BOS", level: r2(ltp - 50 - Math.random() * 50), time: new Date(Date.now() - 45*60e3).toISOString(), direction: "BULLISH" as const, strength: "STRONG" as const },
      { type: "BOS", level: r2(ltp + 30 + Math.random() * 40), time: new Date(Date.now() - 20*60e3).toISOString(), direction: bull ? "BULLISH" as const : "BEARISH" as const, strength: Math.random() > 0.5 ? "STRONG" as const : "WEAK" as const },
    ],
    choch: [{ type: "CHOCH", level: r2(ltp + (bull ? -80 : 80) + Math.random() * 30), time: new Date(Date.now() - 90*60e3).toISOString(), direction: bull ? "BULLISH" as const : "BEARISH" as const, strength: "STRONG" as const }],
    liquidity: {
      buySideLiquidity: [r2(ltp + 100), r2(ltp + 180), swingHigh],
      sellSideLiquidity: [r2(ltp - 90), r2(ltp - 170), swingLow],
      equalHighs: [r2(swingHigh - 10), r2(swingHigh - 5)],
      equalLows:  [r2(swingLow + 8),   r2(swingLow + 3)],
      liquiditySweeps: [{ level: r2(ltp - 110), time: new Date(Date.now() - 40*60e3).toISOString(), type: "SSL_SWEEP" as const, swept: true }],
    },
    orderBlocks: [
      { id: "ob1", top: r2(ltp - 120 + Math.random() * 20), bottom: r2(ltp - 145 + Math.random() * 20), type: "BULLISH" as const, strength: "STRONG" as const, timeframe: "15m", mitigated: false, time: new Date(Date.now() - 120*60e3).toISOString() },
      { id: "ob2", top: r2(ltp + 150 + Math.random() * 30), bottom: r2(ltp + 130 + Math.random() * 30), type: "BEARISH" as const, strength: "MODERATE" as const, timeframe: "1h", mitigated: false, time: new Date(Date.now() - 240*60e3).toISOString() },
    ],
    fairValueGaps: [
      { id: "fvg1", top: r2(ltp - 20), bottom: r2(ltp - 35), type: "BULLISH" as const, filled: false, fillPercent: r2(Math.random() * 30), time: new Date(Date.now() - 15*60e3).toISOString() },
      { id: "fvg2", top: r2(ltp + 60), bottom: r2(ltp + 45), type: "BEARISH" as const, filled: true, fillPercent: 100, time: new Date(Date.now() - 60*60e3).toISOString() },
    ],
    bias: bull ? "BULLISH" as const : Math.random() > 0.5 ? "BEARISH" as const : "NEUTRAL" as const,
    keyLevels: [
      { level: r2(ltp + 150), type: "RESISTANCE" as const, strength: "STRONG" as const, label: "Weekly High" },
      { level: r2(ltp + 75),  type: "RESISTANCE" as const, strength: "MODERATE" as const, label: "Daily Resistance" },
      { level: r2(ltp - 85),  type: "SUPPORT" as const, strength: "STRONG" as const, label: "Daily Support" },
      { level: r2(ltp - 200), type: "SUPPORT" as const, strength: "STRONG" as const, label: "Weekly Low" },
      { level: r2(ltp + 20),  type: "PIVOT" as const, strength: "MODERATE" as const, label: "CPR" },
    ],
  };
}

// ── Option chain ──────────────────────────────────────────────────────────────

export function generateOptionChain(spotPrice: number) {
  const atm = Math.round(spotPrice / 50) * 50;
  const strikes = Array.from({ length: 21 }, (_, k) => {
    const i = k - 10;
    const strike = atm + i * 50;
    const isAtm = i === 0; const m = Math.abs(i); const callItm = i < 0; const putItm = i > 0;
    const callLtp = callItm ? r2(spotPrice - strike + 15 + Math.random() * 10) : r2(Math.max(1, 80 - m * 12 + (Math.random() - 0.5) * 20));
    const putLtp  = putItm  ? r2(strike - spotPrice + 15 + Math.random() * 10) : r2(Math.max(1, 80 - m * 12 + (Math.random() - 0.5) * 20));
    const callOi = r0((isAtm ? 8e6 : 5e6 - m * 4e5 + Math.random() * 5e5) * Math.random() * 0.3 + (isAtm ? 6e6 : 3e6));
    const putOi  = r0((isAtm ? 9e6 : 5.5e6 - m * 3.5e5 + Math.random() * 5e5) * Math.random() * 0.3 + (isAtm ? 7e6 : 3.5e6));
    const opt = (ltp: number, oi: number, sign: number, itm: boolean) => ({
      ltp, iv: r2(12 + m * 1.5 + Math.random() * 3),
      delta: r2(itm ? sign * (0.7 + Math.random() * 0.2) : sign * (0.5 - m * 0.08 + Math.random() * 0.05)),
      gamma: r2(isAtm ? 0.004 : 0.002 - m * 0.0001), theta: r2(-(isAtm ? 12 : 8 - m * 0.5) - Math.random() * 3),
      vega: r2(isAtm ? 45 : 35 - m * 3 + Math.random() * 5), oi, oiChange: r0((Math.random() - 0.4) * oi * 0.1),
      volume: r0(oi * 0.15 * Math.random()), bidPrice: r2(ltp - 0.5), askPrice: r2(ltp + 0.5),
    });
    return { strikePrice: strike, call: opt(callLtp, callOi, 1, callItm), put: opt(putLtp, putOi, -1, putItm) };
  });
  const totalCallOI = strikes.reduce((s, x) => s + x.call.oi, 0);
  const totalPutOI  = strikes.reduce((s, x) => s + x.put.oi, 0);

  function nextThursday() {
    const d = new Date();
    while (d.getDay() !== 4) d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }
  return { expiry: nextThursday(), spotPrice, strikes, totalCallOI, totalPutOI };
}

export function generateOptionsMetrics(spotPrice: number) {
  const pcr = r2(0.7 + Math.random() * 0.9);
  const atm = Math.round(spotPrice / 50) * 50;
  const indiaVix = r2(12 + Math.random() * 8);
  const totalCallOI = r0(80e6 + Math.random() * 30e6);
  return {
    pcr, pcrSignal: (pcr > 1.2 ? "BULLISH" : pcr < 0.8 ? "BEARISH" : "NEUTRAL") as "BULLISH"|"BEARISH"|"NEUTRAL",
    maxPain: r2(atm - 50 + Math.round(Math.random() * 4) * 50),
    indiaVix, vixChange: r2((Math.random() - 0.5) * 2),
    vixSignal: (indiaVix > 18 ? "HIGH_VOLATILITY" : indiaVix < 14 ? "LOW_VOLATILITY" : "NORMAL") as "HIGH_VOLATILITY"|"LOW_VOLATILITY"|"NORMAL",
    totalCallOI, totalPutOI: r0(totalCallOI * pcr),
    oiRatio: r2(pcr),
    putCallBuildupSignal: pcr > 1.1 ? "Put Writing (Bullish)" : pcr < 0.9 ? "Call Writing (Bearish)" : "Mixed OI Activity",
    supportLevel: r2(spotPrice - 100 - Math.random() * 100),
    resistanceLevel: r2(spotPrice + 100 + Math.random() * 100),
    expiries: (function() {
      const out: string[] = [];
      const d = new Date();
      while (out.length < 4) { d.setDate(d.getDate() + 1); if (d.getDay() === 4) out.push(d.toISOString().slice(0, 10)); }
      return out;
    })(),
  };
}
