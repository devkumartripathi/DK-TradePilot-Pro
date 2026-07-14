/**
 * Nifty AI Auto Signals — Market Data & Signal Engine
 *
 * All market data is simulated. The architecture is structured for
 * direct replacement with Zerodha Kite API (see bottom of file).
 *
 * Signal flow:
 *   computeIndicators()          ← swap with kite.getQuote() + kite.getHistoricalData()
 *   scoreCallBuy/PutBuy/...()   ← pure scoring — no data dependency, stays unchanged
 *   buildSignal()               ← pure builder — stays unchanged
 *   generateTradeSignals()      ← orchestrator — stays unchanged
 */

// ─── Utilities ────────────────────────────────────────────────────────────────

let baseNifty = 24580.35;
let lastTick   = Date.now();

function drift(v: number, pct = 0.001): number { return v + (Math.random() - 0.48) * v * pct; }
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round0(n: number): number { return Math.round(n); }
function rand(lo: number, hi: number): number { return lo + Math.random() * (hi - lo); }
function clamp(v: number, lo: number, hi: number): number { return Math.min(hi, Math.max(lo, v)); }

// ─── Shared price state ───────────────────────────────────────────────────────

export function getNiftyLtp(): number {
  if ((Date.now() - lastTick) / 1000 > 2) { baseNifty = drift(baseNifty); lastTick = Date.now(); }
  return round2(baseNifty);
}

// ─── Basic market data generators ─────────────────────────────────────────────

export function generateNiftyData() {
  const ltp = getNiftyLtp();
  const open = round2(ltp - (Math.random() - 0.45) * 120);
  const dayHigh = round2(Math.max(ltp, open) + Math.random() * 60);
  const dayLow  = round2(Math.min(ltp, open) - Math.random() * 60);
  const prevClose = round2(ltp - (Math.random() - 0.45) * 80);
  const change  = round2(ltp - prevClose);
  const now     = new Date();
  const h       = now.getHours();
  const marketStatus =
    h >= 9 && h < 16 ? "OPEN"
    : h === 9 && now.getMinutes() < 15 ? "PRE_OPEN"
    : h >= 16 ? "POST_CLOSE"
    : "CLOSED";
  return {
    ltp, open, high: dayHigh, low: dayLow, close: round2(ltp - (Math.random() - 0.5) * 5),
    change, changePercent: round2((change / prevClose) * 100),
    volume: round0(125e6 + Math.random() * 50e6),
    dayHigh, dayLow, weekHigh52: 24968.70, weekLow52: 19426.35,
    marketStatus, timestamp: new Date().toISOString(),
    trend: change > 0.3 * prevClose / 100 ? "BULLISH" : change < -0.3 * prevClose / 100 ? "BEARISH" : "NEUTRAL",
  };
}

export function generateCandles(timeframe: string, limit: number) {
  const ms: Record<string, number> = { "1m": 60e3, "5m": 300e3, "15m": 900e3, "1h": 3600e3, "1d": 86400e3 };
  const interval = ms[timeframe] ?? 300e3;
  let price = baseNifty;
  const now = Date.now();
  return Array.from({ length: limit + 1 }, (_, idx) => {
    const time  = new Date(now - (limit - idx) * interval);
    const open  = round2(price);
    const move  = (Math.random() - 0.48) * price * 0.004;
    const close = round2(open + move);
    const extra = Math.random() * Math.abs(move) * 0.5;
    price = close;
    return { time: time.toISOString(), open, high: round2(Math.max(open, close) + extra), low: round2(Math.min(open, close) - extra), close, volume: round0(800e3 + Math.random() * 1.2e6) };
  });
}

export function generateVwap() {
  const ltp = getNiftyLtp();
  const vwap = round2(ltp - (Math.random() - 0.5) * 40);
  const std  = round2(30 + Math.random() * 20);
  return {
    vwap, upperBand1: round2(vwap + std), upperBand2: round2(vwap + std * 2),
    lowerBand1: round2(vwap - std), lowerBand2: round2(vwap - std * 2),
    currentPrice: ltp,
    priceVsVwap: ltp > vwap + 10 ? "ABOVE" : ltp < vwap - 10 ? "BELOW" : "AT",
    vwapTrend: Math.random() > 0.5 ? "RISING" : Math.random() > 0.5 ? "FALLING" : "FLAT",
  };
}

export function generateSmcAnalysis() {
  const ltp = getNiftyLtp();
  const bull = Math.random() > 0.4;
  const swingHigh = round2(ltp + 80 + Math.random() * 120);
  const swingLow  = round2(ltp - 80 - Math.random() * 120);
  const phases = ["ACCUMULATION","DISTRIBUTION","MARKUP","MARKDOWN","CONSOLIDATION"] as const;
  return {
    marketStructure: {
      trend: bull ? "UPTREND" as const : Math.random() > 0.5 ? "DOWNTREND" as const : "SIDEWAYS" as const,
      higherHigh: bull, higherLow: bull, lowerHigh: !bull, lowerLow: !bull,
      currentSwingHigh: swingHigh, currentSwingLow: swingLow,
      phase: phases[Math.floor(Math.random() * phases.length)],
    },
    bos: [
      { type: "BOS", level: round2(ltp - 50 - Math.random() * 50), time: new Date(Date.now() - 45*60e3).toISOString(), direction: "BULLISH" as const, strength: "STRONG" as const },
      { type: "BOS", level: round2(ltp + 30 + Math.random() * 40), time: new Date(Date.now() - 20*60e3).toISOString(), direction: bull ? "BULLISH" as const : "BEARISH" as const, strength: Math.random() > 0.5 ? "STRONG" as const : "WEAK" as const },
    ],
    choch: [{ type: "CHOCH", level: round2(ltp + (bull ? -80 : 80) + Math.random() * 30), time: new Date(Date.now() - 90*60e3).toISOString(), direction: bull ? "BULLISH" as const : "BEARISH" as const, strength: "STRONG" as const }],
    liquidity: {
      buySideLiquidity: [round2(ltp + 100), round2(ltp + 180), swingHigh],
      sellSideLiquidity: [round2(ltp - 90), round2(ltp - 170), swingLow],
      equalHighs: [round2(swingHigh - 10), round2(swingHigh - 5)],
      equalLows:  [round2(swingLow + 8),   round2(swingLow + 3)],
      liquiditySweeps: [{ level: round2(ltp - 110), time: new Date(Date.now() - 40*60e3).toISOString(), type: "SSL_SWEEP" as const, swept: true }],
    },
    orderBlocks: [
      { id: "ob1", top: round2(ltp - 120 + Math.random() * 20), bottom: round2(ltp - 145 + Math.random() * 20), type: "BULLISH" as const, strength: "STRONG" as const, timeframe: "15m", mitigated: false, time: new Date(Date.now() - 120*60e3).toISOString() },
      { id: "ob2", top: round2(ltp + 150 + Math.random() * 30), bottom: round2(ltp + 130 + Math.random() * 30), type: "BEARISH" as const, strength: "MODERATE" as const, timeframe: "1h", mitigated: false, time: new Date(Date.now() - 240*60e3).toISOString() },
      { id: "ob3", top: round2(ltp - 60 + Math.random() * 10), bottom: round2(ltp - 80 + Math.random() * 10), type: "BULLISH" as const, strength: "WEAK" as const, timeframe: "5m", mitigated: true, time: new Date(Date.now() - 30*60e3).toISOString() },
    ],
    fairValueGaps: [
      { id: "fvg1", top: round2(ltp - 20), bottom: round2(ltp - 35), type: "BULLISH" as const, filled: false, fillPercent: round2(Math.random() * 30), time: new Date(Date.now() - 15*60e3).toISOString() },
      { id: "fvg2", top: round2(ltp + 60), bottom: round2(ltp + 45), type: "BEARISH" as const, filled: true, fillPercent: 100, time: new Date(Date.now() - 60*60e3).toISOString() },
    ],
    bias: bull ? "BULLISH" as const : Math.random() > 0.5 ? "BEARISH" as const : "NEUTRAL" as const,
    keyLevels: [
      { level: round2(ltp + 150), type: "RESISTANCE" as const, strength: "STRONG" as const, label: "Weekly High" },
      { level: round2(ltp + 75),  type: "RESISTANCE" as const, strength: "MODERATE" as const, label: "Daily Resistance" },
      { level: round2(ltp - 85),  type: "SUPPORT" as const, strength: "STRONG" as const, label: "Daily Support" },
      { level: round2(ltp - 200), type: "SUPPORT" as const, strength: "STRONG" as const, label: "Weekly Low" },
      { level: round2(ltp + 20),  type: "PIVOT" as const, strength: "MODERATE" as const, label: "CPR" },
    ],
  };
}

export function generateOptionChain(spotPrice: number) {
  const atm = Math.round(spotPrice / 50) * 50;
  const strikes = Array.from({ length: 21 }, (_, k) => {
    const i = k - 10;
    const strike = atm + i * 50;
    const isAtm = i === 0; const m = Math.abs(i); const callItm = i < 0; const putItm = i > 0;
    const callLtp = callItm ? round2(spotPrice - strike + 15 + Math.random() * 10) : round2(Math.max(1, 80 - m * 12 + (Math.random() - 0.5) * 20));
    const putLtp  = putItm  ? round2(strike - spotPrice + 15 + Math.random() * 10) : round2(Math.max(1, 80 - m * 12 + (Math.random() - 0.5) * 20));
    const callOi = round0((isAtm ? 8e6 : 5e6 - m * 4e5 + Math.random() * 5e5) * Math.random() * 0.3 + (isAtm ? 6e6 : 3e6));
    const putOi  = round0((isAtm ? 9e6 : 5.5e6 - m * 3.5e5 + Math.random() * 5e5) * Math.random() * 0.3 + (isAtm ? 7e6 : 3.5e6));
    const opt = (ltp: number, itm: boolean, oi: number, sign: number) => ({
      ltp, iv: round2(12 + m * 1.5 + Math.random() * 3),
      delta: round2(itm ? sign * (0.7 + Math.random() * 0.2) : sign * (0.5 - m * 0.08 + Math.random() * 0.05)),
      gamma: round2(isAtm ? 0.004 : 0.002 - m * 0.0001),
      theta: round2(-(isAtm ? 12 : 8 - m * 0.5) - Math.random() * 3),
      vega:  round2(isAtm ? 45 : 35 - m * 3 + Math.random() * 5),
      oi, oiChange: round0((Math.random() - 0.4) * oi * 0.1),
      volume: round0(oi * 0.15 * Math.random()),
      bidPrice: round2(ltp - 0.5), askPrice: round2(ltp + 0.5),
    });
    return { strikePrice: strike, call: opt(callLtp, callItm, callOi, 1), put: opt(putLtp, putItm, putOi, -1) };
  });
  return { expiry: getExpiries()[0], spotPrice, strikes, totalCallOI: strikes.reduce((s,x) => s + x.call.oi, 0), totalPutOI: strikes.reduce((s,x) => s + x.put.oi, 0) };
}

function getExpiries(): string[] {
  const out: string[] = [];
  const d = new Date();
  while (out.length < 4) { d.setDate(d.getDate() + 1); if (d.getDay() === 4) out.push(d.toISOString().slice(0, 10)); }
  return out;
}

export function generateOptionsMetrics(spotPrice: number) {
  const pcr = round2(0.7 + Math.random() * 0.9);
  const atmStrike = Math.round(spotPrice / 50) * 50;
  const indiaVix = round2(12 + Math.random() * 8);
  const totalCallOI = round0(80e6 + Math.random() * 30e6);
  return {
    pcr, pcrSignal: (pcr > 1.2 ? "BULLISH" : pcr < 0.8 ? "BEARISH" : "NEUTRAL") as "BULLISH"|"BEARISH"|"NEUTRAL",
    maxPain: round2(atmStrike - 50 + Math.round(Math.random() * 4) * 50),
    indiaVix, vixChange: round2((Math.random() - 0.5) * 2),
    vixSignal: (indiaVix > 18 ? "HIGH_VOLATILITY" : indiaVix < 14 ? "LOW_VOLATILITY" : "NORMAL") as "HIGH_VOLATILITY"|"LOW_VOLATILITY"|"NORMAL",
    totalCallOI, totalPutOI: round0(totalCallOI * pcr),
    oiRatio: round2(totalCallOI * pcr / totalCallOI),
    putCallBuildupSignal: pcr > 1.1 ? "Put Writing (Bullish)" : pcr < 0.9 ? "Call Writing (Bearish)" : "Mixed OI Activity",
    supportLevel: round2(spotPrice - 100 - Math.random() * 100),
    resistanceLevel: round2(spotPrice + 100 + Math.random() * 100),
    expiries: getExpiries(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SIGNAL ENGINE
// ═══════════════════════════════════════════════════════════════════════════════

// ─── Indicator types ──────────────────────────────────────────────────────────

interface Indicators {
  // Price-derived
  rsi: number;            // RSI(14): 0–100
  atr: number;            // ATR(14): points
  ema20: number;          // EMA(20)
  ema50: number;          // EMA(50)
  vwap: number;           // VWAP
  // Options data
  pcr: number;            // Put-Call Ratio
  vix: number;            // India VIX
  callOI: number;         // Total call OI
  putOI: number;          // Total put OI
  maxPain: number;        // Max Pain strike
  volume: number;
  adx: number;
  // Derived signals
  rsiSignal: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" | "RISING" | "FALLING";
  emaSignal: "BULLISH" | "BEARISH" | "NEUTRAL";
  vwapPosition: "ABOVE" | "BELOW" | "AT";
  volumeSignal: "HIGH" | "AVERAGE" | "LOW";
  // ICT structure flags (set by regime)
  bslSwept: boolean;      // Buy-side liquidity swept (bearish signal)
  sslSwept: boolean;      // Sell-side liquidity swept (bullish signal)
  bosDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
  chochDirection: "BULLISH" | "BEARISH" | "NEUTRAL";
  bearishOBPresent: boolean;  // Bearish order block overhead
  bullishOBPresent: boolean;  // Bullish order block below
  bearishFVGOpen: boolean;    // Unfilled bearish FVG above
  bullishFVGOpen: boolean;    // Unfilled bullish FVG below
}

// ─── Market regime — rotates every 15 min for realistic variety ───────────────

type Regime = "STRONG_BULL" | "BULL" | "CALL_SELL_SETUP" | "STRONG_BEAR" | "BEAR" | "PUT_SELL_SETUP";

function getRegime(): Regime {
  const slot = Math.floor(Date.now() / (15 * 60_000));
  const seq: Regime[] = ["STRONG_BULL", "BULL", "CALL_SELL_SETUP", "STRONG_BEAR", "BEAR", "PUT_SELL_SETUP"];
  return seq[slot % seq.length];
}

/**
 * Compute all indicators for the current market regime.
 * 
 * ZERODHA KITE INTEGRATION POINT:
 *   Replace this function body with live data calls:
 *   - rsi/atr/ema20/ema50 ← compute from kite.getHistoricalData("NSE:NIFTY 50", ...)
 *   - vwap ← compute intraday from 1m candles
 *   - pcr/vix/callOI/putOI/maxPain ← from kite.getQuote() + NSE option chain
 *   - bslSwept/sslSwept/bosDirection/chochDirection ← from your structure detection algo
 */
function computeIndicators(spot: number): Indicators {
  const regime = getRegime();

  // ── Core indicator values per regime ──────────────────────────────────────
  //
  // CRITICAL FIX: vwap direction was inverted in CALL_SELL and PUT_SELL regimes.
  //
  // CALL BUY  : spot ABOVE vwap  (trending up, momentum)
  // PUT BUY   : spot BELOW vwap  (trending down, momentum)
  // CALL SELL : spot SLIGHTLY above vwap but RSI overbought — overextension
  // PUT SELL  : spot SLIGHTLY below vwap but RSI oversold  — panic dip

  let rsi: number, ema20: number, ema50: number, vwap: number, pcr: number, vix: number,
      maxPain: number, bslSwept: boolean, sslSwept: boolean,
      bosDir: "BULLISH"|"BEARISH"|"NEUTRAL", chochDir: "BULLISH"|"BEARISH"|"NEUTRAL",
      bearishOBPresent: boolean, bullishOBPresent: boolean,
      bearishFVGOpen: boolean, bullishFVGOpen: boolean;

  const atm = Math.round(spot / 50) * 50;

  switch (regime) {
    // ── CALL BUY: textbook bullish trend ────────────────────────────────────
    case "STRONG_BULL":
      rsi  = round2(rand(53, 66));          // momentum zone
      ema20 = round2(spot + rand(22, 42));   // EMA20 well above EMA50
      ema50 = round2(spot - rand(12, 35));
      vwap = round2(spot - rand(18, 38));   // spot above VWAP — bullish
      pcr  = round2(rand(1.24, 1.58));      // put writing dominant
      vix  = round2(rand(12.5, 16.5));
      maxPain = atm - 50;
      bslSwept = false; sslSwept = true;    // SSL swept = institutions bought
      bosDir = "BULLISH"; chochDir = "BULLISH";
      bearishOBPresent = false; bullishOBPresent = true;
      bearishFVGOpen = false; bullishFVGOpen = true;
      break;

    case "BULL":
      rsi  = round2(rand(49, 63));
      ema20 = round2(spot + rand(18, 36));
      ema50 = round2(spot - rand(6, 26));
      vwap = round2(spot - rand(12, 30));
      pcr  = round2(rand(1.15, 1.42));
      vix  = round2(rand(13.0, 17.5));
      maxPain = atm;
      bslSwept = false; sslSwept = true;
      bosDir = "BULLISH"; chochDir = "BULLISH";
      bearishOBPresent = false; bullishOBPresent = true;
      bearishFVGOpen = false; bullishFVGOpen = true;
      break;

    // ── CALL SELL: RSI overbought at bearish OB — sell call premium ──────────
    // Spot is slightly above VWAP (overextension, not a major rally).
    // RSI overbought + bearish OB overhead + BSL swept + call OI wall.
    case "CALL_SELL_SETUP":
      rsi  = round2(rand(70, 79));          // PRIMARY: overbought at resistance
      ema20 = round2(spot - rand(16, 32));   // EMA bearish cross
      ema50 = round2(spot + rand(10, 28));
      vwap = round2(spot - rand(8, 20));    // spot slightly above VWAP (overbought extension)
      pcr  = round2(rand(0.72, 0.86));      // call writing dominant = bearish
      vix  = round2(rand(12.0, 16.0));      // low VIX → theta decay works
      maxPain = atm - 100;                  // max pain significantly below spot
      bslSwept = true;  sslSwept = false;   // BSL swept = stop hunt done, ready to reverse
      bosDir = "BEARISH"; chochDir = "BEARISH";
      bearishOBPresent = true; bullishOBPresent = false;
      bearishFVGOpen = true; bullishFVGOpen = false;
      break;

    // ── PUT BUY: textbook bearish trend ─────────────────────────────────────
    case "STRONG_BEAR":
      rsi  = round2(rand(36, 50));
      ema20 = round2(spot - rand(22, 42));
      ema50 = round2(spot + rand(12, 35));
      vwap = round2(spot + rand(18, 38));   // spot below VWAP — bearish
      pcr  = round2(rand(0.72, 0.87));
      vix  = round2(rand(18.5, 23.5));
      maxPain = atm + 50;
      bslSwept = true; sslSwept = false;    // BSL swept = distribution complete
      bosDir = "BEARISH"; chochDir = "BEARISH";
      bearishOBPresent = true; bullishOBPresent = false;
      bearishFVGOpen = true; bullishFVGOpen = false;
      break;

    case "BEAR":
      rsi  = round2(rand(38, 52));
      ema20 = round2(spot - rand(18, 36));
      ema50 = round2(spot + rand(6, 26));
      vwap = round2(spot + rand(14, 30));
      pcr  = round2(rand(0.75, 0.90));
      vix  = round2(rand(17.0, 22.0));
      maxPain = atm;
      bslSwept = true; sslSwept = false;
      bosDir = "BEARISH"; chochDir = "BEARISH";
      bearishOBPresent = true; bullishOBPresent = false;
      bearishFVGOpen = true; bullishFVGOpen = false;
      break;

    // ── PUT SELL: RSI oversold at bullish OB — sell put premium ─────────────
    // Spot is slightly below VWAP (panic dip into support zone).
    // RSI oversold + bullish OB below + SSL swept + put OI wall.
    case "PUT_SELL_SETUP":
      rsi  = round2(rand(21, 31));          // PRIMARY: oversold at support
      ema20 = round2(spot + rand(18, 36));   // EMA bullish structure intact
      ema50 = round2(spot - rand(4, 22));
      vwap = round2(spot + rand(8, 20));    // spot slightly below VWAP (panic dip)
      pcr  = round2(rand(1.32, 1.62));      // put writing dominant = bullish
      vix  = round2(rand(12.0, 16.0));      // low VIX → theta decay works
      maxPain = atm + 100;                  // max pain significantly above spot
      bslSwept = false; sslSwept = true;    // SSL swept = stop hunt done, ready to bounce
      bosDir = "BULLISH"; chochDir = "BULLISH";
      bearishOBPresent = false; bullishOBPresent = true;
      bearishFVGOpen = false; bullishFVGOpen = true;
      break;
  }

  // Shared noisy indicators
  const atr    = round2(clamp(rand(90, 170) + (Math.random() - 0.5) * 25, 75, 195));
  const adx    = round2(rand(28, 48));
  const callOI = round0(rand(72e6, 115e6));
  const putOI  = round0(callOI * pcr);
  const volume = round0(rand(115e6, 178e6));

  // Derived categorical signals
  const rsiSignal: Indicators["rsiSignal"] =
    rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : rsi > 56 ? "RISING" : rsi < 44 ? "FALLING" : "NEUTRAL";
  const emaSignal: Indicators["emaSignal"] =
    ema20 > ema50 + 15 ? "BULLISH" : ema20 < ema50 - 15 ? "BEARISH" : "NEUTRAL";
  const vwapPosition: Indicators["vwapPosition"] =
    spot > vwap + 12 ? "ABOVE" : spot < vwap - 12 ? "BELOW" : "AT";
  const volumeSignal: Indicators["volumeSignal"] =
    volume > 145e6 ? "HIGH" : volume < 108e6 ? "LOW" : "AVERAGE";

  return {
    rsi, atr, ema20, ema50, vwap, pcr, vix, callOI, putOI, maxPain,
    volume, adx, rsiSignal, emaSignal, vwapPosition, volumeSignal,
    bslSwept, sslSwept, bosDirection: bosDir, chochDirection: chochDir,
    bearishOBPresent, bullishOBPresent, bearishFVGOpen, bullishFVGOpen,
  };
}

// ─── Scoring primitives ───────────────────────────────────────────────────────

type SignalType = "CALL_BUY" | "CALL_SELL" | "PUT_BUY" | "PUT_SELL";
interface ScoreFactor  { name: string; score: number; maxScore: number; signal: string; }
interface ScoredSignal { type: SignalType; confidence: number; factors: ScoreFactor[]; }

/** Helper: push a scored factor and return it. */
function factor(factors: ScoreFactor[], name: string, score: number, max: number, signal: string): void {
  factors.push({ name, score: clamp(score, 0, max), maxScore: max, signal });
}

// ─── CALL BUY ─────────────────────────────────────────────────────────────────
// Conditions: Bullish BOS + SSL swept + Bullish OB at entry + FVG fill
//             + price above VWAP + RSI 45-65 + EMA bullish + PCR>1.1 + low VIX

function scoreCallBuy(ind: Indicators): ScoredSignal {
  const f: ScoreFactor[] = [];

  // PRIMARY GROUP (must-haves — total max 50)
  factor(f, "BOS (Break of Structure)",
    ind.bosDirection === "BULLISH" ? 14 : ind.bosDirection === "NEUTRAL" ? 7 : 1, 14,
    ind.bosDirection === "BULLISH" ? "Bullish BOS confirmed on 15m — higher high structure intact" : "No clear bullish BOS");

  factor(f, "CHOCH (Change of Character)",
    ind.chochDirection === "BULLISH" ? 12 : ind.chochDirection === "NEUTRAL" ? 6 : 1, 12,
    ind.chochDirection === "BULLISH" ? "Bullish CHOCH — buyers absorbed sellers at swing low" : "No bullish CHOCH");

  factor(f, "Liquidity Sweep — SSL",
    ind.sslSwept ? 12 : 4, 12,
    ind.sslSwept ? "SSL swept below support — institutional accumulation confirmed" : "No SSL sweep detected");

  factor(f, "Order Block (Bullish OB)",
    ind.bullishOBPresent ? 12 : 4, 12,
    ind.bullishOBPresent ? "Bullish OB on 15m — unmitigated demand zone holding price" : "No clear bullish OB at entry");

  // CONFIRMATION GROUP (total max 37)
  factor(f, "Fair Value Gap (Bullish FVG)",
    ind.bullishFVGOpen ? 9 : ind.bearishFVGOpen ? 2 : 5, 9,
    ind.bullishFVGOpen ? "Unfilled bullish FVG below — acts as magnetic support" : "No bullish FVG visible");

  factor(f, "VWAP Position",
    ind.vwapPosition === "ABOVE" ? 10 : ind.vwapPosition === "AT" ? 6 : 2, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "ABOVE" ? "bullish momentum confirmed" : "below VWAP, momentum weak"}`);

  factor(f, "PCR — Put-Call Ratio",
    ind.pcr > 1.25 ? 8 : ind.pcr > 1.10 ? 6 : ind.pcr > 0.95 ? 3 : 1, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr > 1.15 ? "Put writing dominant: institutions bullish" : "Neutral OI activity"}`);

  factor(f, "India VIX",
    ind.vix < 14 ? 7 : ind.vix < 17 ? 6 : ind.vix < 20 ? 3 : 1, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 15 ? "Low vol, CE buyers benefit" : ind.vix < 18 ? "Moderate vol, manageable" : "Elevated vol — wider SL needed"}`);

  factor(f, "RSI (14)",
    ind.rsi >= 46 && ind.rsi <= 65 ? 9 : ind.rsi > 65 && ind.rsi < 70 ? 5 : ind.rsi >= 38 && ind.rsi < 46 ? 4 : 1, 9,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsiSignal}${ind.rsi >= 46 && ind.rsi <= 65 ? " (momentum zone: ideal for CE buy)" : ""}`);

  factor(f, "EMA 20 / EMA 50",
    ind.emaSignal === "BULLISH" ? 9 : ind.emaSignal === "NEUTRAL" ? 5 : 1, 9,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BULLISH" ? ">" : ind.emaSignal === "NEUTRAL" ? "≈" : "<"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal} cross`);

  // SUPPORTING GROUP (total max 18)
  const maxPainAbove = ind.maxPain > ind.ema20 - 100;  // proxy — max pain at or above entry region
  factor(f, "Max Pain",
    ind.putOI > ind.callOI ? 5 : 3, 5,
    `Max Pain ${ind.maxPain} — ${ind.putOI > ind.callOI ? "Put OI dominant, max pain supports bullish drift" : "Call wall above"}`);

  factor(f, "Open Interest Analysis",
    ind.putOI > ind.callOI * 1.12 ? 7 : ind.putOI >= ind.callOI ? 5 : 2, 7,
    `Put OI ${(ind.putOI/1e6).toFixed(1)}M vs Call OI ${(ind.callOI/1e6).toFixed(1)}M — ${ind.putOI > ind.callOI ? "put writing dominant" : "call writers heavy"}`);

  factor(f, "ATR (14)",
    ind.atr >= 90 && ind.atr <= 160 ? 5 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr <= 160 ? "optimal for CE entry, SL manageable" : "high vol — widen SL"}`);

  factor(f, "Volume",
    ind.volumeSignal === "HIGH" ? 4 : ind.volumeSignal === "AVERAGE" ? 3 : 1, 4,
    `Volume ${(ind.volume/1e6).toFixed(0)}M — ${ind.volumeSignal}${ind.volumeSignal === "HIGH" ? " (breakout confirmation)" : ""}`);

  const total = f.reduce((s, x) => s + x.score, 0);
  const max   = f.reduce((s, x) => s + x.maxScore, 0);
  return { type: "CALL_BUY", confidence: round2((total / max) * 100), factors: f };
}

// ─── PUT BUY ──────────────────────────────────────────────────────────────────
// Conditions: Bearish BOS + BSL swept + Bearish OB rejection + FVG overhead
//             + price below VWAP + RSI 35-55 falling + EMA bearish + PCR<0.9 + high VIX

function scorePutBuy(ind: Indicators): ScoredSignal {
  const f: ScoreFactor[] = [];

  factor(f, "BOS (Break of Structure)",
    ind.bosDirection === "BEARISH" ? 14 : ind.bosDirection === "NEUTRAL" ? 7 : 1, 14,
    ind.bosDirection === "BEARISH" ? "Bearish BOS — lower low confirmed, downtrend structure active" : "No clear bearish BOS");

  factor(f, "CHOCH (Change of Character)",
    ind.chochDirection === "BEARISH" ? 12 : ind.chochDirection === "NEUTRAL" ? 6 : 1, 12,
    ind.chochDirection === "BEARISH" ? "Bearish CHOCH — sellers absorbed buyers at swing high" : "No bearish CHOCH");

  factor(f, "Liquidity Sweep — BSL",
    ind.bslSwept ? 12 : 4, 12,
    ind.bslSwept ? "BSL swept above resistance — institutional distribution confirmed, reversal due" : "No BSL sweep");

  factor(f, "Order Block (Bearish OB)",
    ind.bearishOBPresent ? 12 : 4, 12,
    ind.bearishOBPresent ? "Bearish OB on 1h — unmitigated supply zone rejecting price" : "No clear bearish OB at entry");

  factor(f, "Fair Value Gap (Bearish FVG)",
    ind.bearishFVGOpen ? 9 : ind.bullishFVGOpen ? 2 : 5, 9,
    ind.bearishFVGOpen ? "Unfilled bearish FVG overhead — resistance magnet pulling price down" : "No bearish FVG");

  factor(f, "VWAP Position",
    ind.vwapPosition === "BELOW" ? 10 : ind.vwapPosition === "AT" ? 6 : 2, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "BELOW" ? "below VWAP: bearish momentum confirmed" : "above VWAP, momentum mixed"}`);

  factor(f, "PCR — Put-Call Ratio",
    ind.pcr < 0.78 ? 8 : ind.pcr < 0.88 ? 6 : ind.pcr < 0.98 ? 3 : 1, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr < 0.85 ? "Call writing dominant: institutions bearish" : "Neutral OI"}`);

  factor(f, "India VIX",
    ind.vix > 18 ? 7 : ind.vix > 16 ? 6 : ind.vix > 14 ? 3 : 1, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix > 18 ? "Elevated vol: PE buyers benefit from panic" : ind.vix > 15 ? "Rising vol supports bearish case" : "Low vol: check for momentum"}`);

  factor(f, "RSI (14)",
    ind.rsi >= 36 && ind.rsi <= 55 ? 9 : ind.rsi > 55 && ind.rsi < 60 ? 5 : ind.rsi < 36 && ind.rsi >= 30 ? 4 : 1, 9,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsiSignal}${ind.rsi >= 36 && ind.rsi <= 52 ? " (bearish momentum zone)" : ind.rsi < 30 ? " (oversold — wait for bounce)" : ""}`);

  factor(f, "EMA 20 / EMA 50",
    ind.emaSignal === "BEARISH" ? 9 : ind.emaSignal === "NEUTRAL" ? 5 : 1, 9,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BEARISH" ? "<" : "≈"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal} alignment`);

  factor(f, "Max Pain",
    ind.callOI > ind.putOI ? 5 : 3, 5,
    `Max Pain ${ind.maxPain} — ${ind.callOI > ind.putOI ? "Call OI dominant, max pain supports bearish drift" : "Put wall below"}`);

  factor(f, "Open Interest Analysis",
    ind.callOI > ind.putOI * 1.12 ? 7 : ind.callOI >= ind.putOI ? 5 : 2, 7,
    `Call OI ${(ind.callOI/1e6).toFixed(1)}M vs Put OI ${(ind.putOI/1e6).toFixed(1)}M — ${ind.callOI > ind.putOI ? "call writing dominant" : "put writers heavy"}`);

  factor(f, "ATR (14)",
    ind.atr >= 90 && ind.atr <= 160 ? 5 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr >= 100 ? "sufficient range for PE momentum trade" : "low vol — may need patience"}`);

  factor(f, "Volume",
    ind.volumeSignal === "HIGH" ? 4 : ind.volumeSignal === "AVERAGE" ? 3 : 1, 4,
    `Volume ${(ind.volume/1e6).toFixed(0)}M — ${ind.volumeSignal}`);

  const total = f.reduce((s, x) => s + x.score, 0);
  const max   = f.reduce((s, x) => s + x.maxScore, 0);
  return { type: "PUT_BUY", confidence: round2((total / max) * 100), factors: f };
}

// ─── CALL SELL ────────────────────────────────────────────────────────────────
// Premium-selling strategy — SHORT a call at OTM resistance.
// Profit from time decay when Nifty stays below the sold strike.
//
// ICT criteria (in priority order):
//  1. RSI OVERBOUGHT > 70 at a bearish OB resistance zone  [PRIMARY]
//  2. BSL (Buy-Side Liquidity) swept — stop hunt completed  [PRIMARY]
//  3. Bearish CHOCH — structure failed at resistance         [PRIMARY]
//  4. Bearish OB overhead — supply zone unmitgated           [CONFIRM]
//  5. Unfilled bearish FVG above current price               [CONFIRM]
//  6. Price at or slightly above VWAP (overextension)        [CONFIRM]
//  7. High call OI wall at the sold strike                   [CONFIRM]
//  8. PCR < 0.85 (retail call-buying frenzy = sell signal)  [CONFIRM]
//  9. VIX 12–17 (theta decay accelerated, risk manageable)   [SUPPORT]
// 10. EMA death cross (EMA20 < EMA50)                        [SUPPORT]
// 11. ATR in comfortable range for SL placement              [SUPPORT]
// 12. Max Pain well below spot (gravitational pull down)      [SUPPORT]

function scoreCallSell(ind: Indicators): ScoredSignal {
  const f: ScoreFactor[] = [];

  // PRIMARY: RSI overbought is the #1 gate for CALL SELL
  // Full points only when RSI is clearly overbought (>70)
  const rsiPrimary =
    ind.rsi > 74 ? 15 :
    ind.rsi > 70 ? 13 :
    ind.rsi > 67 ? 8  :
    ind.rsi > 63 ? 4  : 1;
  factor(f, "RSI Overbought (Primary Gate)",
    rsiPrimary, 15,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsi > 70 ? "OVERBOUGHT: prime condition for CALL SELL, retail euphoria at peak" : ind.rsi > 65 ? "Approaching overbought — partial setup" : "Not overbought — weak CALL SELL setup"}`);

  // PRIMARY: BSL swept = institutional stop-hunt completed, reversal imminent
  factor(f, "BSL Sweep (Buy-Side Liquidity)",
    ind.bslSwept ? 13 : 3, 13,
    ind.bslSwept
      ? "BSL swept above resistance: smart money ran stops above swing high, reversal now probable"
      : "No BSL sweep — stop hunt not complete, early CALL SELL carries higher risk");

  // PRIMARY: Bearish CHOCH — price failed to sustain above a prior swing high
  factor(f, "Bearish CHOCH at Resistance",
    ind.chochDirection === "BEARISH" ? 13 : ind.chochDirection === "NEUTRAL" ? 5 : 1, 13,
    ind.chochDirection === "BEARISH"
      ? "Bearish CHOCH confirmed: lower high formed at resistance — buyers exhausted, momentum shifting"
      : "No bearish CHOCH — structure not yet confirmed bearish");

  // CONFIRM: Bearish OB overhead — supply zone where institutions sold previously
  factor(f, "Bearish Order Block (OB)",
    ind.bearishOBPresent ? 11 : 3, 11,
    ind.bearishOBPresent
      ? "Bearish OB on 1h overhead — unmitigated supply zone, ideal strike zone for short call"
      : "No clear bearish OB — resistance not institutionally validated");

  // CONFIRM: Unfilled bearish FVG above = overhead resistance magnet
  factor(f, "Bearish FVG (Unfilled)",
    ind.bearishFVGOpen ? 9 : ind.bullishFVGOpen ? 1 : 5, 9,
    ind.bearishFVGOpen
      ? "Unfilled bearish FVG overhead — acts as a cap on price, sold strike protected"
      : "No bearish FVG — overhead resistance less defined");

  // CONFIRM: For CALL SELL, spot should be at/slightly above VWAP (overextension)
  // Spot well above VWAP = ideal. Below VWAP = not a CALL SELL environment.
  const vwapCallSellScore =
    ind.vwapPosition === "ABOVE" ? 10 :
    ind.vwapPosition === "AT"    ? 6  : 2;
  factor(f, "VWAP Overextension",
    vwapCallSellScore, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "ABOVE" ? "overbought extension above VWAP: ideal for CALL SELL" : ind.vwapPosition === "AT" ? "at VWAP — marginal setup" : "below VWAP — not a CALL SELL environment"}`);

  // CONFIRM: High call OI at the resistance = institutional resistance wall
  const callOIWall = ind.callOI > ind.putOI * 1.18 ? 9 : ind.callOI > ind.putOI * 1.05 ? 7 : ind.callOI > ind.putOI ? 4 : 1;
  factor(f, "Call OI Wall at Resistance",
    callOIWall, 9,
    `Call OI ${(ind.callOI/1e6).toFixed(1)}M vs Put OI ${(ind.putOI/1e6).toFixed(1)}M — ${ind.callOI > ind.putOI ? "heavy call OI: institutions defending resistance" : "put OI heavier — resistance less defined"}`);

  // CONFIRM: PCR low = aggressive retail call buying = contrarian sell signal
  const pcrScore =
    ind.pcr < 0.76 ? 8 :
    ind.pcr < 0.84 ? 7 :
    ind.pcr < 0.92 ? 4 : 1;
  factor(f, "PCR (Contrarian Signal)",
    pcrScore, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr < 0.85 ? "call-buying frenzy: retail is long CE, smart money on opposite side" : "PCR neutral — contrarian edge limited"}`);

  // SUPPORT: VIX 12–17 optimal for premium selling
  const vixScore =
    ind.vix >= 12 && ind.vix < 15 ? 7 :
    ind.vix >= 15 && ind.vix < 17 ? 6 :
    ind.vix >= 17 && ind.vix < 20 ? 3 : 1;
  factor(f, "India VIX (Premium Collection)",
    vixScore, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 15 ? "low VIX: theta decay accelerated, risk manageable" : ind.vix < 17 ? "moderate VIX: acceptable for selling" : "high VIX: elevated risk for short calls"}`);

  // SUPPORT: EMA death cross confirms bearish structure
  factor(f, "EMA 20 / EMA 50 (Death Cross)",
    ind.emaSignal === "BEARISH" ? 7 : ind.emaSignal === "NEUTRAL" ? 4 : 1, 7,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BEARISH" ? "<" : "≈"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal === "BEARISH" ? "death cross: higher-TF bearish context for CALL SELL" : "no bearish cross yet"}`);

  // SUPPORT: ATR range for manageable SL on the short call
  factor(f, "ATR (14) — SL Sizing",
    ind.atr >= 80 && ind.atr < 145 ? 5 : ind.atr < 80 ? 2 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr < 145 ? "manageable range: SL on short call within tolerance" : "wide ATR: tighten position size"}`);

  // SUPPORT: Max Pain well below spot = gravitational pull favors bearish drift
  const mpBelowSpot = ind.maxPain < ind.vwap;  // proxy using vwap as a spot reference
  factor(f, "Max Pain Gravity",
    mpBelowSpot ? 5 : 2, 5,
    `Max Pain ${ind.maxPain} — ${mpBelowSpot ? "below current zone: pin risk favors bears, OI gravity supports CALL SELL" : "above current zone: max pain pull mixed"}`);

  const total = f.reduce((s, x) => s + x.score, 0);
  const max   = f.reduce((s, x) => s + x.maxScore, 0);
  return { type: "CALL_SELL", confidence: round2((total / max) * 100), factors: f };
}

// ─── PUT SELL ─────────────────────────────────────────────────────────────────
// Premium-selling strategy — SHORT a put at OTM support.
// Profit from time decay when Nifty stays above the sold strike.
//
// ICT criteria (in priority order):
//  1. RSI OVERSOLD < 30 at a bullish OB support zone        [PRIMARY]
//  2. SSL (Sell-Side Liquidity) swept — stop hunt completed  [PRIMARY]
//  3. Bullish CHOCH — price found support and reversed       [PRIMARY]
//  4. Bullish OB below — demand zone unmitgated              [CONFIRM]
//  5. Unfilled bullish FVG below current price               [CONFIRM]
//  6. Price at or slightly below VWAP (panic dip)            [CONFIRM]
//  7. High put OI wall at the sold strike                    [CONFIRM]
//  8. PCR > 1.25 (retail put-buying panic = sell signal)     [CONFIRM]
//  9. VIX 12–17 (theta decay works, panic may be overdone)   [SUPPORT]
// 10. EMA golden structure (EMA20 > EMA50)                   [SUPPORT]
// 11. ATR in comfortable range                               [SUPPORT]
// 12. Max Pain well above spot (gravitational pull up)        [SUPPORT]

function scorePutSell(ind: Indicators): ScoredSignal {
  const f: ScoreFactor[] = [];

  // PRIMARY: RSI oversold is the #1 gate for PUT SELL
  const rsiPrimary =
    ind.rsi < 26 ? 15 :
    ind.rsi < 30 ? 13 :
    ind.rsi < 33 ? 8  :
    ind.rsi < 37 ? 4  : 1;
  factor(f, "RSI Oversold (Primary Gate)",
    rsiPrimary, 15,
    `RSI ${ind.rsi.toFixed(1)} — ${ind.rsi < 30 ? "OVERSOLD: prime condition for PUT SELL, retail capitulation at support" : ind.rsi < 35 ? "Approaching oversold — partial setup" : "Not oversold — weak PUT SELL setup"}`);

  // PRIMARY: SSL swept = institutional stop-hunt below support, bounce imminent
  factor(f, "SSL Sweep (Sell-Side Liquidity)",
    ind.sslSwept ? 13 : 3, 13,
    ind.sslSwept
      ? "SSL swept below support: smart money raided stops, retail panicked — institutional buying underway"
      : "No SSL sweep — stop hunt incomplete, early PUT SELL is higher risk");

  // PRIMARY: Bullish CHOCH — price found support and buyers stepped in
  factor(f, "Bullish CHOCH at Support",
    ind.chochDirection === "BULLISH" ? 13 : ind.chochDirection === "NEUTRAL" ? 5 : 1, 13,
    ind.chochDirection === "BULLISH"
      ? "Bullish CHOCH confirmed: higher low forming at support — sellers exhausted, buyers in control"
      : "No bullish CHOCH — support not yet confirmed");

  // CONFIRM: Bullish OB below — demand zone where institutions bought
  factor(f, "Bullish Order Block (OB)",
    ind.bullishOBPresent ? 11 : 3, 11,
    ind.bullishOBPresent
      ? "Bullish OB on 15m below — unmitigated demand zone, ideal strike zone for short put"
      : "No clear bullish OB — support not institutionally validated");

  // CONFIRM: Unfilled bullish FVG below = downside cushion
  factor(f, "Bullish FVG (Unfilled)",
    ind.bullishFVGOpen ? 9 : ind.bearishFVGOpen ? 1 : 5, 9,
    ind.bullishFVGOpen
      ? "Unfilled bullish FVG below — acts as a floor, sold strike protected by institutional demand"
      : "No bullish FVG — downside support less defined");

  // CONFIRM: Spot slightly below VWAP = panic dip, recovery likely
  const vwapPutSellScore =
    ind.vwapPosition === "BELOW" ? 10 :
    ind.vwapPosition === "AT"    ? 6  : 2;
  factor(f, "VWAP Oversold Dip",
    vwapPutSellScore, 10,
    `Price ${ind.vwapPosition} VWAP (${ind.vwap.toFixed(0)}) — ${ind.vwapPosition === "BELOW" ? "panic dip below VWAP: ideal for PUT SELL — mean-reversion likely" : ind.vwapPosition === "AT" ? "at VWAP — marginal setup" : "above VWAP — not a PUT SELL environment"}`);

  // CONFIRM: High put OI at the support = institutional put writers defending
  const putOIWall = ind.putOI > ind.callOI * 1.18 ? 9 : ind.putOI > ind.callOI * 1.05 ? 7 : ind.putOI > ind.callOI ? 4 : 1;
  factor(f, "Put OI Wall at Support",
    putOIWall, 9,
    `Put OI ${(ind.putOI/1e6).toFixed(1)}M vs Call OI ${(ind.callOI/1e6).toFixed(1)}M — ${ind.putOI > ind.callOI ? "heavy put OI: institutions defending support — expiry pin likely" : "call OI heavier — support less defined"}`);

  // CONFIRM: PCR high = aggressive retail put-buying panic = contrarian buy signal
  const pcrScore =
    ind.pcr > 1.38 ? 8 :
    ind.pcr > 1.26 ? 7 :
    ind.pcr > 1.12 ? 4 : 1;
  factor(f, "PCR (Contrarian Signal)",
    pcrScore, 8,
    `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr > 1.25 ? "put-buying panic: retail is loading PE, smart money selling puts against them" : "PCR not extreme — contrarian edge limited"}`);

  // SUPPORT: VIX 12–17 optimal for premium selling
  const vixScore =
    ind.vix >= 12 && ind.vix < 15 ? 7 :
    ind.vix >= 15 && ind.vix < 17 ? 6 :
    ind.vix >= 17 && ind.vix < 20 ? 3 : 1;
  factor(f, "India VIX (Premium Collection)",
    vixScore, 7,
    `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 15 ? "low-moderate VIX: theta decay optimal for PUT SELL" : ind.vix < 17 ? "acceptable for selling" : "high VIX: elevated risk — may spike further against short put"}`);

  // SUPPORT: EMA golden structure — higher-TF bullish context
  factor(f, "EMA 20 / EMA 50 (Golden Structure)",
    ind.emaSignal === "BULLISH" ? 7 : ind.emaSignal === "NEUTRAL" ? 4 : 1, 7,
    `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BULLISH" ? ">" : "≈"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal === "BULLISH" ? "golden structure: higher-TF bullish context for PUT SELL" : "no bullish EMA cross yet"}`);

  // SUPPORT: ATR range for SL on the short put
  factor(f, "ATR (14) — SL Sizing",
    ind.atr >= 80 && ind.atr < 145 ? 5 : ind.atr < 80 ? 2 : 3, 5,
    `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr < 145 ? "manageable range: SL on short put within risk tolerance" : "wide ATR: reduce position size"}`);

  // SUPPORT: Max Pain well above spot = gravitational pull favors bullish recovery
  const mpAboveSpot = ind.maxPain > ind.vwap;  // proxy
  factor(f, "Max Pain Gravity",
    mpAboveSpot ? 5 : 2, 5,
    `Max Pain ${ind.maxPain} — ${mpAboveSpot ? "above current zone: OI gravity pulls price up, PUT SELL benefits" : "below current zone — max pain pull mixed"}`);

  const total = f.reduce((s, x) => s + x.score, 0);
  const max   = f.reduce((s, x) => s + x.maxScore, 0);
  return { type: "PUT_SELL", confidence: round2((total / max) * 100), factors: f };
}

// ─── Signal builder ───────────────────────────────────────────────────────────

type OptionSignalMeta = {
  direction: "BUY" | "SELL";
  optionType: "CE" | "PE";
  strikeOffset: number;   // from ATM
  slMultiplier: number;   // × ATR
  t1Multiplier: number;   // × ATR
  t2Multiplier: number;   // × ATR
};

// ATR-derived SL/TP for realistic, volatility-adjusted levels.
// BUY signals: larger multiples (momentum play, wider range).
// SELL signals: tighter SL (defending a sold strike), smaller T targets.
const SIGNAL_META: Record<SignalType, OptionSignalMeta> = {
  CALL_BUY:  { direction: "BUY",  optionType: "CE", strikeOffset:  50, slMultiplier: 0.32, t1Multiplier: 0.42, t2Multiplier: 0.72 },
  PUT_BUY:   { direction: "BUY",  optionType: "PE", strikeOffset: -50, slMultiplier: 0.32, t1Multiplier: 0.42, t2Multiplier: 0.72 },
  CALL_SELL: { direction: "SELL", optionType: "CE", strikeOffset:  80, slMultiplier: 0.28, t1Multiplier: 0.38, t2Multiplier: 0.60 },
  PUT_SELL:  { direction: "SELL", optionType: "PE", strikeOffset: -80, slMultiplier: 0.28, t1Multiplier: 0.38, t2Multiplier: 0.60 },
};

const RATIONALES: Record<SignalType, (ind: Indicators, spot: number, strike: number, sl: number, t1: number, t2: number) => string> = {
  CALL_BUY: (ind, spot, strike) =>
    `ICT bullish OTE: SSL swept at ${(spot - ind.atr * 0.15).toFixed(0)}, confirmed by bullish CHOCH above ${(spot - 35).toFixed(0)} swing. EMA20 ${ind.ema20.toFixed(0)} > EMA50 ${ind.ema50.toFixed(0)} — golden cross momentum. Price reclaimed VWAP (${ind.vwap.toFixed(0)}): bullish context active. RSI ${ind.rsi.toFixed(1)} in momentum zone. PCR ${ind.pcr.toFixed(2)}: put writing dominant — institutions net long. Bullish OB ${(spot - 135).toFixed(0)}–${(spot - 110).toFixed(0)} acting as launchpad. Enter ${strike}CE.`,

  PUT_BUY: (ind, spot, strike) =>
    `ICT bearish OTE: BSL swept at ${(spot + ind.atr * 0.15).toFixed(0)}, confirmed by bearish CHOCH below ${(spot + 35).toFixed(0)} swing. EMA20 ${ind.ema20.toFixed(0)} < EMA50 ${ind.ema50.toFixed(0)} — death cross momentum. Price rejected VWAP (${ind.vwap.toFixed(0)}) from above: bearish context active. RSI ${ind.rsi.toFixed(1)} in bearish zone. VIX ${ind.vix.toFixed(1)} rising — momentum favors sellers. Bearish OB ${(spot + 140).toFixed(0)}–${(spot + 165).toFixed(0)} capping upside. Enter ${strike}PE.`,

  CALL_SELL: (ind, spot, strike, sl, t1, t2) =>
    `ICT CALL SELL setup: RSI ${ind.rsi.toFixed(1)} overbought at bearish OB resistance. BSL swept at ${(spot + ind.atr * 0.12).toFixed(0)} — stop hunt complete, reversal in progress. Bearish CHOCH confirms lower high at ${(spot + 25).toFixed(0)}. VWAP ${ind.vwap.toFixed(0)} below current price — overextension. Heavy call OI wall at ${strike} (${(ind.callOI/1e6).toFixed(1)}M contracts). PCR ${ind.pcr.toFixed(2)}: retail CE euphoria = smart money SELL signal. VIX ${ind.vix.toFixed(1)}: theta decay accelerated. Max Pain at ${ind.maxPain} well below. Sell ${strike}CE | SL if Nifty breaks ${sl.toFixed(0)} | Targets: ${t1.toFixed(0)} / ${t2.toFixed(0)}.`,

  PUT_SELL: (ind, spot, strike, sl, t1, t2) =>
    `ICT PUT SELL setup: RSI ${ind.rsi.toFixed(1)} oversold at bullish OB support. SSL swept at ${(spot - ind.atr * 0.12).toFixed(0)} — stop hunt complete, reversal in progress. Bullish CHOCH confirms higher low at ${(spot - 25).toFixed(0)}. VWAP ${ind.vwap.toFixed(0)} above current price — panic dip. Heavy put OI wall at ${strike} (${(ind.putOI/1e6).toFixed(1)}M contracts). PCR ${ind.pcr.toFixed(2)}: retail PE panic = smart money SELL signal. VIX ${ind.vix.toFixed(1)}: theta decay optimal. Max Pain at ${ind.maxPain} well above. Sell ${strike}PE | SL if Nifty breaks ${sl.toFixed(0)} | Targets: ${t1.toFixed(0)} / ${t2.toFixed(0)}.`,
};

const SMC_SETUPS: Record<SignalType, string> = {
  CALL_BUY:  "SSL Sweep + Bullish CHOCH + OB Reclaim + VWAP Reclaim",
  PUT_BUY:   "BSL Sweep + Bearish CHOCH + OB Rejection + VWAP Rejection",
  CALL_SELL: "RSI Overbought + BSL Sweep + Bearish CHOCH + OB Resistance",
  PUT_SELL:  "RSI Oversold + SSL Sweep + Bullish CHOCH + OB Support",
};

function getOptionLtp(type: SignalType, strike: number, spot: number): number {
  const intrinsic = (type === "CALL_BUY" || type === "CALL_SELL")
    ? Math.max(0, spot - strike) : Math.max(0, strike - spot);
  return round2(intrinsic + rand(35, 75));
}

function buildSignal(scored: ScoredSignal, spot: number, ind: Indicators, expiry: string): object {
  const { type, confidence, factors } = scored;
  const meta   = SIGNAL_META[type];
  const isBuy  = meta.direction === "BUY";
  const atm    = Math.round(spot / 50) * 50;
  const strike = atm + meta.strikeOffset;

  // ATR-scaled, direction-aware entry / SL / targets on the Nifty underlying
  const slPts = round2(ind.atr * meta.slMultiplier);
  const t1Pts = round2(ind.atr * meta.t1Multiplier);
  const t2Pts = round2(ind.atr * meta.t2Multiplier);

  const entry   = round2(isBuy ? spot + 5 : spot - 5);
  const stopLoss = round2(isBuy ? spot - slPts : spot + slPts);
  const target1  = round2(isBuy ? spot + t1Pts : spot - t1Pts);
  const target2  = round2(isBuy ? spot + t2Pts : spot - t2Pts);
  const target3  = round2(isBuy ? spot + t2Pts * 1.4 : spot - t2Pts * 1.4);  // keep for schema compat
  const riskReward = round2(t2Pts / slPts);

  const confidenceLabel = confidence >= 95 ? "VERY HIGH" : confidence >= 90 ? "HIGH" : "MODERATE";

  return {
    id: `sig_${type.toLowerCase()}_${Date.now()}`,
    type: "INTRADAY", instrument: "NIFTY50", optionSignalType: type,
    direction: meta.direction,
    entry, stopLoss, target1, target2, target3,
    riskReward, confidenceScore: confidence, confidenceLabel,
    rationale: RATIONALES[type](ind, spot, strike, stopLoss, target1, target2),
    smcSetup: SMC_SETUPS[type],
    optionType: meta.optionType,
    strikePrice: strike,
    optionLtp: getOptionLtp(type, strike, spot),
    expiry, status: "ACTIVE",
    timestamp: new Date().toISOString(),
    indicators: ind, scoreFactors: factors, telegramAlertSent: false,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateTradeSignals(spotPrice: number) {
  const now  = new Date();
  const hour = now.getHours();
  const isLunchZone = hour === 12 || (hour === 13 && now.getMinutes() < 30);
  const isExpiry = now.getDay() === 4;

  const noTradeZone  = isLunchZone;
  const noTradeReason = isLunchZone
    ? "Lunch consolidation zone (12:00–13:30 IST). Liquidity thins — avoid premium-selling entries."
    : null;

  const indicators = computeIndicators(spotPrice);

  // Score all four signal types, pick the highest-confidence one
  const allScores: ScoredSignal[] = [
    scoreCallBuy(indicators),
    scorePutBuy(indicators),
    scoreCallSell(indicators),
    scorePutSell(indicators),
  ].sort((a, b) => b.confidence - a.confidence);

  const best   = allScores[0];
  const expiry = getExpiries()[0];

  // Emit exactly one signal when confidence ≥ 90% and not in no-trade zone
  const signals = (!noTradeZone && best.confidence >= 90)
    ? [buildSignal(best, spotPrice, indicators, expiry)]
    : [];

  const marketBias: "BULLISH"|"BEARISH"|"NEUTRAL" =
    best.type === "CALL_BUY"  || best.type === "PUT_SELL"  ? "BULLISH"
    : best.type === "PUT_BUY" || best.type === "CALL_SELL" ? "BEARISH"
    : "NEUTRAL";

  return {
    signals, noTradeZone, noTradeReason,
    marketBias, sessionTime: isExpiry ? "EXPIRY_DAY" : "NORMAL_SESSION",
    generatedAt: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════════════════════
// ZERODHA KITE API INTEGRATION GUIDE
// ═══════════════════════════════════════════════════════════════════════════════
//
// To replace the simulator with live NSE data, swap computeIndicators() with
// the adapter below. Everything else (scoring, building, Telegram dispatch)
// stays unchanged.
//
//  import KiteConnect from "kiteconnect";
//
//  const kite = new KiteConnect({ api_key: process.env.KITE_API_KEY! });
//  kite.setAccessToken(process.env.KITE_ACCESS_TOKEN!);
//
//  async function computeIndicatorsLive(spot: number): Promise<Indicators> {
//    // 1. OHLCV candles for RSI / ATR / EMA
//    const candles = await kite.getHistoricalData(
//      "NSE:NIFTY 50", "5minute", fromDate, toDate, false
//    );
//    const closes = candles.map((c: any) => c.close);
//    const rsi  = calcRsi(closes, 14);
//    const atr  = calcAtr(candles, 14);
//    const ema20 = calcEma(closes, 20);
//    const ema50 = calcEma(closes, 50);
//
//    // 2. Intraday VWAP from 1m candles
//    const vwap = calcVwap(await kite.getHistoricalData(...));
//
//    // 3. Option chain → PCR, Max Pain, Call/Put OI
//    const chain = await kite.getQuote([...strikeList]);
//    const { pcr, maxPain, callOI, putOI } = calcOptionMetrics(chain);
//
//    // 4. India VIX
//    const vix = (await kite.getQuote(["NSE:INDIA VIX"]))["NSE:INDIA VIX"].last_price;
//
//    // 5. ICT structure detection (implement your BOS/CHOCH/OB/FVG algo here)
//    const structure = detectSmcStructure(candles);
//
//    return { rsi, atr, ema20, ema50, vwap, pcr, vix, callOI, putOI, maxPain,
//             volume: candles.at(-1).volume, adx: calcAdx(candles, 14),
//             ...deriveSignals(rsi, ema20, ema50, vwap, spot, structure) };
//  }
//
// ═══════════════════════════════════════════════════════════════════════════════
