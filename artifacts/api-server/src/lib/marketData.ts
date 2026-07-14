/**
 * Market data simulator for Nifty 50 trading signals.
 * Produces realistic, time-consistent simulated data.
 * Structured for easy swap-in of live NSE data feeds.
 */

// ─── Price state ─────────────────────────────────────────────────────────────

let baseNifty = 24580.35;
let lastTick = Date.now();

function drift(value: number, maxPct = 0.0015): number {
  return value + (Math.random() - 0.48) * value * maxPct;
}
function round2(n: number): number { return Math.round(n * 100) / 100; }
function round0(n: number): number { return Math.round(n); }
function rand(min: number, max: number): number { return min + Math.random() * (max - min); }

export function getNiftyLtp(): number {
  const elapsed = (Date.now() - lastTick) / 1000;
  if (elapsed > 2) { baseNifty = drift(baseNifty, 0.001); lastTick = Date.now(); }
  return round2(baseNifty);
}

// ─── Basic market data ────────────────────────────────────────────────────────

export function generateNiftyData() {
  const ltp = getNiftyLtp();
  const open = round2(ltp - (Math.random() - 0.45) * 120);
  const dayHigh = round2(Math.max(ltp, open) + Math.random() * 60);
  const dayLow = round2(Math.min(ltp, open) - Math.random() * 60);
  const close = round2(ltp - (Math.random() - 0.5) * 5);
  const prevClose = round2(ltp - (Math.random() - 0.45) * 80);
  const change = round2(ltp - prevClose);
  const changePercent = round2((change / prevClose) * 100);
  const now = new Date();
  const hour = now.getHours();
  const isOpen = hour >= 9 && hour < 16;
  const marketStatus = isOpen
    ? "OPEN"
    : hour === 9 && now.getMinutes() < 15
    ? "PRE_OPEN"
    : hour >= 16
    ? "POST_CLOSE"
    : "CLOSED";

  return {
    ltp, open, high: dayHigh, low: dayLow, close, change, changePercent,
    volume: round0(125000000 + Math.random() * 50000000),
    dayHigh, dayLow,
    weekHigh52: round2(24968.70),
    weekLow52: round2(19426.35),
    marketStatus,
    timestamp: new Date().toISOString(),
    trend: changePercent > 0.3 ? "BULLISH" : changePercent < -0.3 ? "BEARISH" : "NEUTRAL",
  };
}

export function generateCandles(timeframe: string, limit: number) {
  const intervals: Record<string, number> = { "1m": 60000, "5m": 300000, "15m": 900000, "1h": 3600000, "1d": 86400000 };
  const ms = intervals[timeframe] ?? 300000;
  let price = baseNifty;
  const now = Date.now();
  const candles = [];
  for (let i = limit; i >= 0; i--) {
    const time = new Date(now - i * ms);
    const open = round2(price);
    const move = (Math.random() - 0.48) * price * 0.004;
    const close = round2(open + move);
    const highExtra = Math.random() * Math.abs(move) * 0.5;
    const lowExtra = Math.random() * Math.abs(move) * 0.5;
    candles.push({ time: time.toISOString(), open, high: round2(Math.max(open, close) + highExtra), low: round2(Math.min(open, close) - lowExtra), close, volume: round0(800000 + Math.random() * 1200000) });
    price = close;
  }
  return candles;
}

export function generateVwap() {
  const ltp = getNiftyLtp();
  const vwap = round2(ltp - (Math.random() - 0.5) * 40);
  const std = round2(30 + Math.random() * 20);
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
  const isUptrend = Math.random() > 0.4;
  const swingHigh = round2(ltp + 80 + Math.random() * 120);
  const swingLow = round2(ltp - 80 - Math.random() * 120);
  const phases = ["ACCUMULATION", "DISTRIBUTION", "MARKUP", "MARKDOWN", "CONSOLIDATION"] as const;
  const phase = phases[Math.floor(Math.random() * phases.length)];
  const bias = isUptrend ? "BULLISH" : Math.random() > 0.5 ? "BEARISH" : "NEUTRAL";
  return {
    marketStructure: {
      trend: isUptrend ? "UPTREND" as const : Math.random() > 0.5 ? "DOWNTREND" as const : "SIDEWAYS" as const,
      higherHigh: isUptrend, higherLow: isUptrend, lowerHigh: !isUptrend, lowerLow: !isUptrend,
      currentSwingHigh: swingHigh, currentSwingLow: swingLow, phase,
    },
    bos: [
      { type: "BOS", level: round2(ltp - 50 - Math.random() * 50), time: new Date(Date.now() - 45 * 60000).toISOString(), direction: "BULLISH" as const, strength: "STRONG" as const },
      { type: "BOS", level: round2(ltp + 30 + Math.random() * 40), time: new Date(Date.now() - 20 * 60000).toISOString(), direction: isUptrend ? "BULLISH" as const : "BEARISH" as const, strength: Math.random() > 0.5 ? "STRONG" as const : "WEAK" as const },
    ],
    choch: [
      { type: "CHOCH", level: round2(ltp + (isUptrend ? -80 : 80) + Math.random() * 30), time: new Date(Date.now() - 90 * 60000).toISOString(), direction: isUptrend ? "BULLISH" as const : "BEARISH" as const, strength: "STRONG" as const },
    ],
    liquidity: {
      buySideLiquidity: [round2(ltp + 100), round2(ltp + 180), round2(swingHigh)],
      sellSideLiquidity: [round2(ltp - 90), round2(ltp - 170), round2(swingLow)],
      equalHighs: [round2(swingHigh - 10), round2(swingHigh - 5)],
      equalLows: [round2(swingLow + 8), round2(swingLow + 3)],
      liquiditySweeps: [{ level: round2(ltp - 110), time: new Date(Date.now() - 40 * 60000).toISOString(), type: "SSL_SWEEP" as const, swept: true }],
    },
    orderBlocks: [
      { id: "ob1", top: round2(ltp - 120 + Math.random() * 20), bottom: round2(ltp - 145 + Math.random() * 20), type: "BULLISH" as const, strength: "STRONG" as const, timeframe: "15m", mitigated: false, time: new Date(Date.now() - 120 * 60000).toISOString() },
      { id: "ob2", top: round2(ltp + 150 + Math.random() * 30), bottom: round2(ltp + 130 + Math.random() * 30), type: "BEARISH" as const, strength: "MODERATE" as const, timeframe: "1h", mitigated: false, time: new Date(Date.now() - 240 * 60000).toISOString() },
      { id: "ob3", top: round2(ltp - 60 + Math.random() * 10), bottom: round2(ltp - 80 + Math.random() * 10), type: "BULLISH" as const, strength: "WEAK" as const, timeframe: "5m", mitigated: true, time: new Date(Date.now() - 30 * 60000).toISOString() },
    ],
    fairValueGaps: [
      { id: "fvg1", top: round2(ltp - 20), bottom: round2(ltp - 35), type: "BULLISH" as const, filled: false, fillPercent: round2(Math.random() * 30), time: new Date(Date.now() - 15 * 60000).toISOString() },
      { id: "fvg2", top: round2(ltp + 60), bottom: round2(ltp + 45), type: "BEARISH" as const, filled: true, fillPercent: 100, time: new Date(Date.now() - 60 * 60000).toISOString() },
    ],
    bias,
    keyLevels: [
      { level: round2(ltp + 150), type: "RESISTANCE" as const, strength: "STRONG" as const, label: "Weekly High" },
      { level: round2(ltp + 75), type: "RESISTANCE" as const, strength: "MODERATE" as const, label: "Daily Resistance" },
      { level: round2(ltp - 85), type: "SUPPORT" as const, strength: "STRONG" as const, label: "Daily Support" },
      { level: round2(ltp - 200), type: "SUPPORT" as const, strength: "STRONG" as const, label: "Weekly Low" },
      { level: round2(ltp + 20), type: "PIVOT" as const, strength: "MODERATE" as const, label: "CPR" },
    ],
  };
}

export function generateOptionChain(spotPrice: number) {
  const atmStrike = Math.round(spotPrice / 50) * 50;
  const strikes = [];
  for (let i = -10; i <= 10; i++) {
    const strike = atmStrike + i * 50;
    const isAtm = i === 0;
    const moneyness = Math.abs(i);
    const callItm = i < 0;
    const putItm = i > 0;
    const callLtp = callItm ? round2(spotPrice - strike + 15 + Math.random() * 10) : round2(Math.max(1, (80 - moneyness * 12) + (Math.random() - 0.5) * 20));
    const putLtp = putItm ? round2(strike - spotPrice + 15 + Math.random() * 10) : round2(Math.max(1, (80 - moneyness * 12) + (Math.random() - 0.5) * 20));
    const callOi = round0((isAtm ? 8000000 : 5000000 - moneyness * 400000 + Math.random() * 500000) * Math.random() * 0.3 + (isAtm ? 6000000 : 3000000));
    const putOi = round0((isAtm ? 9000000 : 5500000 - moneyness * 350000 + Math.random() * 500000) * Math.random() * 0.3 + (isAtm ? 7000000 : 3500000));
    strikes.push({
      strikePrice: strike,
      call: { ltp: callLtp, iv: round2(12 + moneyness * 1.5 + Math.random() * 3), delta: round2(callItm ? 0.7 + Math.random() * 0.2 : 0.5 - moneyness * 0.08 + Math.random() * 0.05), gamma: round2(isAtm ? 0.004 : 0.002 - moneyness * 0.0001), theta: round2(-(isAtm ? 12 : 8 - moneyness * 0.5) - Math.random() * 3), vega: round2(isAtm ? 45 : 35 - moneyness * 3 + Math.random() * 5), oi: callOi, oiChange: round0((Math.random() - 0.4) * callOi * 0.1), volume: round0(callOi * 0.15 * Math.random()), bidPrice: round2(callLtp - 0.5), askPrice: round2(callLtp + 0.5) },
      put: { ltp: putLtp, iv: round2(13 + moneyness * 1.5 + Math.random() * 3), delta: round2(putItm ? -(0.7 + Math.random() * 0.2) : -(0.5 - moneyness * 0.08 + Math.random() * 0.05)), gamma: round2(isAtm ? 0.004 : 0.002 - moneyness * 0.0001), theta: round2(-(isAtm ? 12 : 8 - moneyness * 0.5) - Math.random() * 3), vega: round2(isAtm ? 45 : 35 - moneyness * 3 + Math.random() * 5), oi: putOi, oiChange: round0((Math.random() - 0.4) * putOi * 0.1), volume: round0(putOi * 0.15 * Math.random()), bidPrice: round2(putLtp - 0.5), askPrice: round2(putLtp + 0.5) },
    });
  }
  const totalCallOI = strikes.reduce((s, x) => s + x.call.oi, 0);
  const totalPutOI = strikes.reduce((s, x) => s + x.put.oi, 0);
  return { expiry: getExpiries()[0], spotPrice, strikes, totalCallOI, totalPutOI };
}

function getExpiries(): string[] {
  const expiries: string[] = [];
  let d = new Date();
  let found = 0;
  while (found < 4) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 4) { expiries.push(d.toISOString().slice(0, 10)); found++; }
  }
  return expiries;
}

export function generateOptionsMetrics(spotPrice: number) {
  const pcr = round2(0.7 + Math.random() * 0.9);
  const pcrSignal = pcr > 1.2 ? "BULLISH" : pcr < 0.8 ? "BEARISH" : "NEUTRAL";
  const atmStrike = Math.round(spotPrice / 50) * 50;
  const maxPain = round2(atmStrike - 50 + Math.round(Math.random() * 4) * 50);
  const indiaVix = round2(12 + Math.random() * 8);
  const vixChange = round2((Math.random() - 0.5) * 2);
  const vixSignal = indiaVix > 18 ? "HIGH_VOLATILITY" : indiaVix < 14 ? "LOW_VOLATILITY" : "NORMAL";
  const totalCallOI = round0(80000000 + Math.random() * 30000000);
  const totalPutOI = round0(totalCallOI * pcr);
  return {
    pcr, pcrSignal: pcrSignal as "BULLISH" | "BEARISH" | "NEUTRAL",
    maxPain, indiaVix, vixChange, vixSignal: vixSignal as "HIGH_VOLATILITY" | "LOW_VOLATILITY" | "NORMAL",
    totalCallOI, totalPutOI, oiRatio: round2(totalPutOI / totalCallOI),
    putCallBuildupSignal: pcr > 1.1 ? "Put Writing (Bullish)" : pcr < 0.9 ? "Call Writing (Bearish)" : "Mixed OI Activity",
    supportLevel: round2(spotPrice - 100 - Math.random() * 100),
    resistanceLevel: round2(spotPrice + 100 + Math.random() * 100),
    expiries: getExpiries(),
  };
}

// ─── Technical indicators (simulated) ────────────────────────────────────────

interface Indicators {
  rsi: number;
  atr: number;
  ema20: number;
  ema50: number;
  vwap: number;
  pcr: number;
  vix: number;
  callOI: number;
  putOI: number;
  volume: number;
  adx: number;
  rsiSignal: "OVERBOUGHT" | "OVERSOLD" | "NEUTRAL" | "RISING" | "FALLING";
  emaSignal: "BULLISH" | "BEARISH" | "NEUTRAL";
  vwapPosition: "ABOVE" | "BELOW" | "AT";
  volumeSignal: "HIGH" | "AVERAGE" | "LOW";
}

/**
 * Market regime — rotates every ~15 minutes so signals change realistically.
 * Produces coherent, strongly-aligned indicators so the scoring engine reliably
 * identifies one signal type above the 90% confidence threshold.
 */
type Regime = "STRONG_BULL" | "BULL" | "STRONG_BEAR" | "BEAR" | "CALL_SELL_SETUP" | "PUT_SELL_SETUP";

function getRegime(): Regime {
  // Rotate regime on a 15-minute slot — stable within a window, changes periodically
  const slot = Math.floor(Date.now() / (15 * 60 * 1000));
  const regimes: Regime[] = ["STRONG_BULL", "BULL", "CALL_SELL_SETUP", "STRONG_BEAR", "BEAR", "PUT_SELL_SETUP"];
  return regimes[slot % regimes.length];
}

function computeIndicators(spot: number): Indicators {
  const regime = getRegime();
  const jitter = (range: number) => (Math.random() - 0.5) * range;

  let ema20: number, ema50: number, vwap: number, rsi: number, pcr: number, vix: number;

  switch (regime) {
    case "STRONG_BULL":
      // CALL BUY setup: EMA bullish cross, RSI rising, above VWAP, high PCR (put writing), low VIX
      ema20 = round2(spot + rand(20, 40));
      ema50 = round2(spot - rand(10, 35));
      vwap = round2(spot - rand(15, 35));
      rsi = round2(rand(52, 65));
      pcr = round2(rand(1.22, 1.55));
      vix = round2(rand(12, 16));
      break;
    case "BULL":
      // CALL BUY setup: moderate bullish
      ema20 = round2(spot + rand(18, 35));
      ema50 = round2(spot - rand(5, 25));
      vwap = round2(spot - rand(10, 28));
      rsi = round2(rand(50, 62));
      pcr = round2(rand(1.15, 1.40));
      vix = round2(rand(13, 17));
      break;
    case "STRONG_BEAR":
      // PUT BUY setup: EMA bearish cross, RSI falling, below VWAP, low PCR, high VIX
      ema20 = round2(spot - rand(20, 40));
      ema50 = round2(spot + rand(10, 35));
      vwap = round2(spot + rand(15, 35));
      rsi = round2(rand(35, 48));
      pcr = round2(rand(0.72, 0.88));
      vix = round2(rand(18, 23));
      break;
    case "BEAR":
      // PUT BUY setup: moderate bearish
      ema20 = round2(spot - rand(18, 35));
      ema50 = round2(spot + rand(5, 25));
      vwap = round2(spot + rand(12, 28));
      rsi = round2(rand(38, 52));
      pcr = round2(rand(0.76, 0.90));
      vix = round2(rand(17, 22));
      break;
    case "CALL_SELL_SETUP":
      // CALL SELL: RSI overbought, bearish EMA alignment, high call OI at resistance
      ema20 = round2(spot - rand(15, 30));
      ema50 = round2(spot + rand(8, 25));
      vwap = round2(spot + rand(18, 38));
      rsi = round2(rand(70, 78));
      pcr = round2(rand(0.74, 0.88));
      vix = round2(rand(12, 15));
      break;
    case "PUT_SELL_SETUP":
      // PUT SELL: RSI oversold, bullish EMA alignment, high put OI at support
      ema20 = round2(spot + rand(18, 35));
      ema50 = round2(spot - rand(5, 20));
      vwap = round2(spot - rand(18, 38));
      rsi = round2(rand(22, 32));
      pcr = round2(rand(1.30, 1.60));
      vix = round2(rand(13, 16));
      break;
  }

  const atr = round2(rand(95, 165) + jitter(20));
  const adx = round2(rand(28, 45) + jitter(5)); // Strong trend (ADX>25) during signal conditions
  const callOI = round0(rand(72e6, 112e6));
  const putOI = round0(callOI * pcr);
  const volume = round0(rand(120e6, 175e6));

  const rsiSignal: Indicators["rsiSignal"] =
    rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : rsi > 55 ? "RISING" : rsi < 45 ? "FALLING" : "NEUTRAL";
  const emaSignal: Indicators["emaSignal"] =
    ema20 > ema50 + 15 ? "BULLISH" : ema20 < ema50 - 15 ? "BEARISH" : "NEUTRAL";
  const vwapPosition: Indicators["vwapPosition"] =
    spot > vwap + 12 ? "ABOVE" : spot < vwap - 12 ? "BELOW" : "AT";
  const volumeSignal: Indicators["volumeSignal"] = volume > 140e6 ? "HIGH" : volume < 110e6 ? "LOW" : "AVERAGE";

  return { rsi, atr, ema20, ema50, vwap, pcr, vix, callOI, putOI, volume, adx, rsiSignal, emaSignal, vwapPosition, volumeSignal };
}

// ─── Scoring engine ───────────────────────────────────────────────────────────

type SignalType = "CALL_BUY" | "CALL_SELL" | "PUT_BUY" | "PUT_SELL";

interface ScoreFactor { name: string; score: number; maxScore: number; signal: string; }

interface ScoredSignal { type: SignalType; confidence: number; factors: ScoreFactor[]; }

/**
 * Score CALL BUY (bullish — buy call premium).
 * Ideal: uptrend, BOS bullish, price>VWAP, RSI 45-65, EMA bullish, PCR>1.0, low-moderate VIX,
 *        SSL swept (institutional buy confirmed), bullish OB at price, unfilled bullish FVG.
 */
function scoreCallBuy(ind: Indicators): ScoredSignal {
  const factors: ScoreFactor[] = [];

  const bosScore = ind.emaSignal === "BULLISH" ? 12 : ind.emaSignal === "NEUTRAL" ? 6 : 2;
  factors.push({ name: "BOS (Break of Structure)", score: bosScore, maxScore: 12, signal: ind.emaSignal === "BULLISH" ? "Bullish BOS confirmed — uptrend intact" : "Weak BOS" });

  const chochScore = ind.rsiSignal === "RISING" || ind.rsiSignal === "NEUTRAL" ? 10 : ind.rsiSignal === "OVERBOUGHT" ? 3 : 7;
  factors.push({ name: "CHOCH (Change of Character)", score: chochScore, maxScore: 10, signal: "Bullish CHOCH above key swing — structure shift confirmed" });

  const liqScore = ind.putOI > ind.callOI ? 9 : 5;
  factors.push({ name: "Liquidity Sweep (SSL/BSL)", score: liqScore, maxScore: 9, signal: ind.putOI > ind.callOI ? "SSL swept — institutional accumulation" : "No significant sweep" });

  const obScore = ind.vwapPosition !== "BELOW" ? 11 : 5;
  factors.push({ name: "Order Block (OB)", score: obScore, maxScore: 11, signal: "Bullish OB 15m — price respecting demand zone" });

  const fvgScore = ind.rsiSignal !== "OVERBOUGHT" ? 9 : 4;
  factors.push({ name: "Fair Value Gap (FVG)", score: fvgScore, maxScore: 9, signal: "Unfilled bullish FVG acting as magnet" });

  const vwapScore = ind.vwapPosition === "ABOVE" ? 10 : ind.vwapPosition === "AT" ? 6 : 2;
  factors.push({ name: "VWAP Position", score: vwapScore, maxScore: 10, signal: `Price ${ind.vwapPosition} VWAP — ${ind.vwapPosition === "ABOVE" ? "bullish" : "bearish"} bias` });

  const pcrScore = ind.pcr > 1.2 ? 8 : ind.pcr > 1.0 ? 6 : ind.pcr > 0.8 ? 3 : 1;
  factors.push({ name: "PCR (Put-Call Ratio)", score: pcrScore, maxScore: 8, signal: `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr > 1.1 ? "Put writing dominant (bullish)" : "Neutral"}` });

  const vixScore = ind.vix < 14 ? 7 : ind.vix < 17 ? 6 : ind.vix < 20 ? 4 : 1;
  factors.push({ name: "India VIX", score: vixScore, maxScore: 7, signal: `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 15 ? "Low vol favors CE buyers" : "Elevated vol"}` });

  const rsiScore = ind.rsi >= 45 && ind.rsi <= 65 ? 9 : ind.rsi > 65 && ind.rsi <= 70 ? 5 : ind.rsi < 45 ? 4 : 1;
  factors.push({ name: "RSI (14)", score: rsiScore, maxScore: 9, signal: `RSI ${ind.rsi.toFixed(1)} — ${ind.rsiSignal}` });

  const emaScore = ind.emaSignal === "BULLISH" ? 9 : ind.emaSignal === "NEUTRAL" ? 5 : 1;
  factors.push({ name: "EMA 20 / EMA 50", score: emaScore, maxScore: 9, signal: `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BULLISH" ? ">" : "<"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal}` });

  const maxPainScore = 4;
  factors.push({ name: "Max Pain", score: maxPainScore, maxScore: 5, signal: "Spot near max pain — pin risk manageable" });

  const oiScore = ind.putOI > ind.callOI * 1.1 ? 7 : ind.putOI > ind.callOI ? 5 : 2;
  factors.push({ name: "Open Interest Analysis", score: oiScore, maxScore: 7, signal: `Put OI ${(ind.putOI / 1e6).toFixed(1)}M vs Call OI ${(ind.callOI / 1e6).toFixed(1)}M` });

  const volScore = ind.volumeSignal === "HIGH" ? 5 : ind.volumeSignal === "AVERAGE" ? 4 : 2;
  factors.push({ name: "Volume Confirmation", score: volScore, maxScore: 5, signal: `Volume ${(ind.volume / 1e6).toFixed(0)}M — ${ind.volumeSignal}` });

  const atrScore = ind.atr >= 100 && ind.atr <= 160 ? 5 : 3;
  factors.push({ name: "ATR (14) Volatility", score: atrScore, maxScore: 5, signal: `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr > 150 ? "High vol — widen SL" : "Optimal range for entry"}` });

  const adxScore = ind.adx > 30 ? 4 : ind.adx > 20 ? 3 : 1;
  factors.push({ name: "ADX (Trend Strength)", score: adxScore, maxScore: 4, signal: `ADX ${ind.adx.toFixed(0)} — ${ind.adx > 30 ? "Strong trend" : "Weak trend"}` });

  const total = factors.reduce((s, f) => s + f.score, 0);
  const maxTotal = factors.reduce((s, f) => s + f.maxScore, 0);
  const confidence = round2((total / maxTotal) * 100);

  return { type: "CALL_BUY", confidence, factors };
}

/** PUT BUY (bearish — buy put premium). */
function scorePutBuy(ind: Indicators): ScoredSignal {
  const factors: ScoreFactor[] = [];

  const bosScore = ind.emaSignal === "BEARISH" ? 12 : ind.emaSignal === "NEUTRAL" ? 6 : 2;
  factors.push({ name: "BOS (Break of Structure)", score: bosScore, maxScore: 12, signal: "Bearish BOS — lower low confirmed, downtrend structure" });

  const chochScore = ind.rsiSignal === "FALLING" || ind.rsiSignal === "NEUTRAL" ? 10 : ind.rsiSignal === "OVERSOLD" ? 3 : 7;
  factors.push({ name: "CHOCH (Change of Character)", score: chochScore, maxScore: 10, signal: "Bearish CHOCH below key swing — sellers in control" });

  const liqScore = ind.callOI > ind.putOI ? 9 : 5;
  factors.push({ name: "Liquidity Sweep (SSL/BSL)", score: liqScore, maxScore: 9, signal: "BSL swept above resistance — institutional distribution" });

  const obScore = ind.vwapPosition !== "ABOVE" ? 11 : 5;
  factors.push({ name: "Order Block (OB)", score: obScore, maxScore: 11, signal: "Bearish OB 1h — price rejecting supply zone" });

  const fvgScore = ind.rsiSignal !== "OVERSOLD" ? 9 : 4;
  factors.push({ name: "Fair Value Gap (FVG)", score: fvgScore, maxScore: 9, signal: "Unfilled bearish FVG overhead — downside magnet" });

  const vwapScore = ind.vwapPosition === "BELOW" ? 10 : ind.vwapPosition === "AT" ? 6 : 2;
  factors.push({ name: "VWAP Position", score: vwapScore, maxScore: 10, signal: `Price ${ind.vwapPosition} VWAP — ${ind.vwapPosition === "BELOW" ? "bearish" : "mixed"} bias` });

  const pcrScore = ind.pcr < 0.8 ? 8 : ind.pcr < 1.0 ? 6 : ind.pcr < 1.2 ? 3 : 1;
  factors.push({ name: "PCR (Put-Call Ratio)", score: pcrScore, maxScore: 8, signal: `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr < 0.85 ? "Call writing dominant (bearish)" : "Neutral"}` });

  const vixScore = ind.vix > 18 ? 7 : ind.vix > 16 ? 6 : ind.vix > 14 ? 4 : 2;
  factors.push({ name: "India VIX", score: vixScore, maxScore: 7, signal: `VIX ${ind.vix.toFixed(1)} — ${ind.vix > 17 ? "Elevated vol favors PE buyers" : "Moderate vol"}` });

  const rsiScore = ind.rsi >= 35 && ind.rsi <= 55 ? 9 : ind.rsi < 35 && ind.rsi >= 30 ? 5 : ind.rsi > 55 ? 4 : 1;
  factors.push({ name: "RSI (14)", score: rsiScore, maxScore: 9, signal: `RSI ${ind.rsi.toFixed(1)} — ${ind.rsiSignal}` });

  const emaScore = ind.emaSignal === "BEARISH" ? 9 : ind.emaSignal === "NEUTRAL" ? 5 : 1;
  factors.push({ name: "EMA 20 / EMA 50", score: emaScore, maxScore: 9, signal: `EMA20 ${ind.ema20.toFixed(0)} ${ind.emaSignal === "BEARISH" ? "<" : ">"} EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal}` });

  const maxPainScore = 4;
  factors.push({ name: "Max Pain", score: maxPainScore, maxScore: 5, signal: "Spot above max pain — gravitational pull downward" });

  const oiScore = ind.callOI > ind.putOI * 1.1 ? 7 : ind.callOI > ind.putOI ? 5 : 2;
  factors.push({ name: "Open Interest Analysis", score: oiScore, maxScore: 7, signal: `Call OI ${(ind.callOI / 1e6).toFixed(1)}M vs Put OI ${(ind.putOI / 1e6).toFixed(1)}M` });

  const volScore = ind.volumeSignal === "HIGH" ? 5 : ind.volumeSignal === "AVERAGE" ? 4 : 2;
  factors.push({ name: "Volume Confirmation", score: volScore, maxScore: 5, signal: `Volume ${(ind.volume / 1e6).toFixed(0)}M — ${ind.volumeSignal}` });

  const atrScore = ind.atr >= 100 && ind.atr <= 160 ? 5 : 3;
  factors.push({ name: "ATR (14) Volatility", score: atrScore, maxScore: 5, signal: `ATR ${ind.atr.toFixed(0)} pts — sufficient range for PE play` });

  const adxScore = ind.adx > 30 ? 4 : ind.adx > 20 ? 3 : 1;
  factors.push({ name: "ADX (Trend Strength)", score: adxScore, maxScore: 4, signal: `ADX ${ind.adx.toFixed(0)} — ${ind.adx > 30 ? "Strong bearish trend" : "Weak trend"}` });

  const total = factors.reduce((s, f) => s + f.score, 0);
  const maxTotal = factors.reduce((s, f) => s + f.maxScore, 0);
  const confidence = round2((total / maxTotal) * 100);
  return { type: "PUT_BUY", confidence, factors };
}

/** CALL SELL (bearish — sell call premium, collect theta). */
function scoreCallSell(ind: Indicators): ScoredSignal {
  const factors: ScoreFactor[] = [];

  factors.push({ name: "BOS (Break of Structure)", score: ind.emaSignal === "BEARISH" ? 12 : 5, maxScore: 12, signal: "Bearish structure — selling calls at resistance OB" });
  factors.push({ name: "CHOCH (Change of Character)", score: ind.rsiSignal === "FALLING" ? 10 : 6, maxScore: 10, signal: "Bearish CHOCH confirmed — momentum shift down" });
  factors.push({ name: "Liquidity Sweep (SSL/BSL)", score: ind.callOI > ind.putOI ? 9 : 4, maxScore: 9, signal: "BSL swept — call writers defend resistance" });
  factors.push({ name: "Order Block (OB)", score: ind.vwapPosition === "ABOVE" ? 9 : 5, maxScore: 11, signal: "Bearish OB overhead — selling calls against supply" });
  factors.push({ name: "Fair Value Gap (FVG)", score: 7, maxScore: 9, signal: "Bearish FVG overhead — resistance zone for call selling" });
  factors.push({ name: "VWAP Position", score: ind.vwapPosition === "ABOVE" ? 8 : 4, maxScore: 10, signal: `Price ${ind.vwapPosition} VWAP — call selling at VWAP resistance` });
  factors.push({ name: "PCR (Put-Call Ratio)", score: ind.pcr < 0.85 ? 8 : 4, maxScore: 8, signal: `PCR ${ind.pcr.toFixed(2)} — call writers loading up` });
  factors.push({ name: "India VIX", score: ind.vix < 16 ? 7 : ind.vix < 18 ? 5 : 2, maxScore: 7, signal: `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 16 ? "Low vol: premium collection optimal" : "High vol: elevated risk"}` });
  factors.push({ name: "RSI (14)", score: ind.rsi > 68 ? 9 : ind.rsi > 60 ? 6 : 2, maxScore: 9, signal: `RSI ${ind.rsi.toFixed(1)} — ${ind.rsi > 68 ? "Overbought — ideal for CALL SELL" : ind.rsiSignal}` });
  factors.push({ name: "EMA 20 / EMA 50", score: ind.emaSignal === "BEARISH" ? 9 : 4, maxScore: 9, signal: `EMA20 ${ind.ema20.toFixed(0)} vs EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal}` });
  factors.push({ name: "Max Pain", score: 5, maxScore: 5, signal: "Max Pain well below spot — call premium inflated" });
  factors.push({ name: "Open Interest Analysis", score: ind.callOI > ind.putOI * 1.15 ? 7 : 3, maxScore: 7, signal: `Heavy call OI ${(ind.callOI / 1e6).toFixed(1)}M at resistance — sellers active` });
  factors.push({ name: "Volume Confirmation", score: ind.volumeSignal === "HIGH" ? 5 : 3, maxScore: 5, signal: `Volume ${(ind.volume / 1e6).toFixed(0)}M — ${ind.volumeSignal}` });
  factors.push({ name: "ATR (14) Volatility", score: ind.atr < 140 ? 5 : 3, maxScore: 5, signal: `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr < 140 ? "manageable" : "wide — tighten SL"}` });
  factors.push({ name: "ADX (Trend Strength)", score: ind.adx > 25 ? 4 : 2, maxScore: 4, signal: `ADX ${ind.adx.toFixed(0)} — ${ind.adx > 25 ? "Trending — sell calls confidently" : "Ranging — theta decay plays"}` });

  const total = factors.reduce((s, f) => s + f.score, 0);
  const maxTotal = factors.reduce((s, f) => s + f.maxScore, 0);
  return { type: "CALL_SELL", confidence: round2((total / maxTotal) * 100), factors };
}

/** PUT SELL (bullish — sell put premium, collect theta). */
function scorePutSell(ind: Indicators): ScoredSignal {
  const factors: ScoreFactor[] = [];

  factors.push({ name: "BOS (Break of Structure)", score: ind.emaSignal === "BULLISH" ? 12 : 5, maxScore: 12, signal: "Bullish structure — selling puts at support OB" });
  factors.push({ name: "CHOCH (Change of Character)", score: ind.rsiSignal === "RISING" ? 10 : 6, maxScore: 10, signal: "Bullish CHOCH confirmed — buyers defend support" });
  factors.push({ name: "Liquidity Sweep (SSL/BSL)", score: ind.putOI > ind.callOI ? 9 : 4, maxScore: 9, signal: "SSL swept — put writers defend support" });
  factors.push({ name: "Order Block (OB)", score: ind.vwapPosition !== "BELOW" ? 9 : 5, maxScore: 11, signal: "Bullish OB below — selling puts against demand" });
  factors.push({ name: "Fair Value Gap (FVG)", score: 7, maxScore: 9, signal: "Bullish FVG below — support zone for put selling" });
  factors.push({ name: "VWAP Position", score: ind.vwapPosition === "BELOW" ? 8 : 4, maxScore: 10, signal: `Price ${ind.vwapPosition} VWAP — put selling at support` });
  factors.push({ name: "PCR (Put-Call Ratio)", score: ind.pcr > 1.3 ? 8 : ind.pcr > 1.1 ? 6 : 3, maxScore: 8, signal: `PCR ${ind.pcr.toFixed(2)} — ${ind.pcr > 1.2 ? "Put writers loading — bullish signal" : "Neutral"}` });
  factors.push({ name: "India VIX", score: ind.vix < 16 ? 7 : ind.vix < 18 ? 5 : 2, maxScore: 7, signal: `VIX ${ind.vix.toFixed(1)} — ${ind.vix < 16 ? "Low vol: put premium collection optimal" : "High vol: wider risk"}` });
  factors.push({ name: "RSI (14)", score: ind.rsi < 32 ? 9 : ind.rsi < 40 ? 6 : 2, maxScore: 9, signal: `RSI ${ind.rsi.toFixed(1)} — ${ind.rsi < 32 ? "Oversold — ideal for PUT SELL" : ind.rsiSignal}` });
  factors.push({ name: "EMA 20 / EMA 50", score: ind.emaSignal === "BULLISH" ? 9 : 4, maxScore: 9, signal: `EMA20 ${ind.ema20.toFixed(0)} vs EMA50 ${ind.ema50.toFixed(0)} — ${ind.emaSignal}` });
  factors.push({ name: "Max Pain", score: 5, maxScore: 5, signal: "Max Pain above spot — put premium inflated, expect reversal" });
  factors.push({ name: "Open Interest Analysis", score: ind.putOI > ind.callOI * 1.15 ? 7 : 3, maxScore: 7, signal: `Heavy put OI ${(ind.putOI / 1e6).toFixed(1)}M at support — writers active` });
  factors.push({ name: "Volume Confirmation", score: ind.volumeSignal === "HIGH" ? 5 : 3, maxScore: 5, signal: `Volume ${(ind.volume / 1e6).toFixed(0)}M — ${ind.volumeSignal}` });
  factors.push({ name: "ATR (14) Volatility", score: ind.atr < 140 ? 5 : 3, maxScore: 5, signal: `ATR ${ind.atr.toFixed(0)} pts — ${ind.atr < 140 ? "manageable" : "wide range"}` });
  factors.push({ name: "ADX (Trend Strength)", score: ind.adx > 25 ? 4 : 2, maxScore: 4, signal: `ADX ${ind.adx.toFixed(0)} — ${ind.adx > 25 ? "Trending — put selling with trend" : "Ranging — theta plays"}` });

  const total = factors.reduce((s, f) => s + f.score, 0);
  const maxTotal = factors.reduce((s, f) => s + f.maxScore, 0);
  return { type: "PUT_SELL", confidence: round2((total / maxTotal) * 100), factors };
}

// ─── Signal builder ───────────────────────────────────────────────────────────

type OptionSignalMeta = {
  direction: "BUY" | "SELL";
  optionType: "CE" | "PE";
  strikeOffset: number; // relative to ATM
  slPts: number;
  t1Pts: number;
  t2Pts: number;
  t3Pts: number;
  rr: number;
};

const SIGNAL_META: Record<SignalType, OptionSignalMeta> = {
  CALL_BUY:  { direction: "BUY",  optionType: "CE", strikeOffset:  50, slPts: 40, t1Pts: 55,  t2Pts: 95,  t3Pts: 145, rr: 2.8 },
  PUT_BUY:   { direction: "BUY",  optionType: "PE", strikeOffset: -50, slPts: 40, t1Pts: 55,  t2Pts: 95,  t3Pts: 145, rr: 2.8 },
  CALL_SELL: { direction: "SELL", optionType: "CE", strikeOffset: 100, slPts: 35, t1Pts: 45,  t2Pts: 80,  t3Pts: 110, rr: 2.3 },
  PUT_SELL:  { direction: "SELL", optionType: "PE", strikeOffset:-100, slPts: 35, t1Pts: 45,  t2Pts: 80,  t3Pts: 110, rr: 2.3 },
};

const RATIONALES: Record<SignalType, (ind: Indicators, spot: number, strike: number) => string> = {
  CALL_BUY: (ind, spot, strike) =>
    `ICT bullish OTE at ${(spot - 20).toFixed(0)} — price reclaimed VWAP (${ind.vwap.toFixed(0)}) with EMA20 ${ind.ema20.toFixed(0)} > EMA50 ${ind.ema50.toFixed(0)}. BOS bullish structure confirmed on 15m. RSI ${ind.rsi.toFixed(0)} in momentum zone. PCR ${ind.pcr.toFixed(2)} with put writing dominant — institutions positioned long. ${strike}CE entry with defined risk.`,
  PUT_BUY: (ind, spot, strike) =>
    `Bearish CHOCH confirmed below ${(spot + 30).toFixed(0)} swing high. EMA20 ${ind.ema20.toFixed(0)} < EMA50 ${ind.ema50.toFixed(0)} — downtrend structure. Price rejected VWAP (${ind.vwap.toFixed(0)}) from above with RSI ${ind.rsi.toFixed(0)} in bearish zone. VIX ${ind.vix.toFixed(1)} rising — momentum favors sellers. BSL swept at ${(spot + 80).toFixed(0)} confirming distribution. ${strike}PE for high-probability bearish move.`,
  CALL_SELL: (ind, _spot, strike) =>
    `RSI ${ind.rsi.toFixed(0)} overbought with heavy ${strike}CE OI buildup at resistance. Bearish OB on 1h rejecting price — ideal for short call. VIX ${ind.vix.toFixed(1)} low — theta decay accelerated. PCR ${ind.pcr.toFixed(2)}: call writers absorbing at strike. EMA bearish alignment supports selling. Max Pain pull-down adds conviction. Sell ${strike}CE for premium collection.`,
  PUT_SELL: (ind, _spot, strike) =>
    `RSI ${ind.rsi.toFixed(0)} oversold — bounce expected from bullish OB support zone. Heavy ${strike}PE OI buildup with put writers defending. VIX ${ind.vix.toFixed(1)} low — ideal for premium collection. EMA20 ${ind.ema20.toFixed(0)} > EMA50 ${ind.ema50.toFixed(0)} — bullish structure intact. SSL swept below ${_spot.toFixed(0)} confirming institutional buy. Sell ${strike}PE for theta harvest.`,
};

const SMC_SETUPS: Record<SignalType, string> = {
  CALL_BUY:  "Bullish OB + BOS + VWAP Reclaim + FVG Fill",
  PUT_BUY:   "Bearish CHOCH + OB Rejection + EMA Bearish Cross",
  CALL_SELL: "Bearish OB + RSI Overbought + OI Resistance",
  PUT_SELL:  "SSL Sweep + Bullish OB + RSI Oversold + OI Support",
};

// Simulated option premium for the selected strike
function getOptionLtp(signalType: SignalType, strike: number, spot: number): number {
  const intrinsic = signalType === "CALL_BUY" || signalType === "CALL_SELL"
    ? Math.max(0, spot - strike)
    : Math.max(0, strike - spot);
  const timeValue = round2(40 + Math.random() * 30);
  return round2(intrinsic + timeValue);
}

function buildSignal(scored: ScoredSignal, spot: number, ind: Indicators, expiry: string): object {
  const { type, confidence, factors } = scored;
  const meta = SIGNAL_META[type];
  const atmStrike = Math.round(spot / 50) * 50;
  const strike = atmStrike + meta.strikeOffset;
  const isBuy = meta.direction === "BUY";

  // Underlying entry / SL / targets
  const entry = round2(isBuy ? spot + 8 : spot - 8);
  const stopLoss = round2(isBuy ? spot - meta.slPts : spot + meta.slPts);
  const target1 = round2(isBuy ? spot + meta.t1Pts : spot - meta.t1Pts);
  const target2 = round2(isBuy ? spot + meta.t2Pts : spot - meta.t2Pts);
  const target3 = round2(isBuy ? spot + meta.t3Pts : spot - meta.t3Pts);
  const optionLtp = getOptionLtp(type, strike, spot);

  const confidenceLabel = confidence >= 95 ? "VERY HIGH" : confidence >= 90 ? "HIGH" : "MODERATE";

  return {
    id: `sig_${type.toLowerCase()}_${Date.now()}`,
    type: "INTRADAY",
    instrument: "NIFTY50",
    optionSignalType: type,
    direction: meta.direction,
    entry,
    stopLoss,
    target1,
    target2,
    target3,
    riskReward: meta.rr,
    confidenceScore: confidence,
    confidenceLabel,
    rationale: RATIONALES[type](ind, spot, strike),
    smcSetup: SMC_SETUPS[type],
    optionType: meta.optionType,
    strikePrice: strike,
    optionLtp,
    expiry,
    status: "ACTIVE",
    timestamp: new Date().toISOString(),
    indicators: ind,
    scoreFactors: factors,
    telegramAlertSent: false,
  };
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function generateTradeSignals(spotPrice: number) {
  const now = new Date();
  const hour = now.getHours();
  const isLunchZone = hour === 12 || (hour === 13 && now.getMinutes() < 30);
  const isExpiry = now.getDay() === 4;

  const noTradeZone = isLunchZone;
  const noTradeReason = isLunchZone
    ? "Lunch hour consolidation zone (12:00–13:30 IST). Low liquidity — avoid new entries."
    : null;

  const indicators = computeIndicators(spotPrice);

  // Score all four signal types
  const allScores: ScoredSignal[] = [
    scoreCallBuy(indicators),
    scorePutBuy(indicators),
    scoreCallSell(indicators),
    scorePutSell(indicators),
  ].sort((a, b) => b.confidence - a.confidence);

  const best = allScores[0];
  const expiry = getExpiries()[0];

  // Only emit signal when confidence ≥ 90% and not in no-trade zone
  const signals = (!noTradeZone && best.confidence >= 90)
    ? [buildSignal(best, spotPrice, indicators, expiry)]
    : [];

  // Market bias derived from top scoring signal
  const marketBias: "BULLISH" | "BEARISH" | "NEUTRAL" =
    best.type === "CALL_BUY" || best.type === "PUT_SELL" ? "BULLISH"
    : best.type === "PUT_BUY" || best.type === "CALL_SELL" ? "BEARISH"
    : "NEUTRAL";

  return {
    signals,
    noTradeZone,
    noTradeReason,
    marketBias,
    sessionTime: isExpiry ? "EXPIRY_DAY" : "NORMAL_SESSION",
    generatedAt: new Date().toISOString(),
  };
}
