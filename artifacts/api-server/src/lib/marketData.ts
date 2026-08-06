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
import { fyers } from "./fyersClient";
import { getAccessToken } from "./tokenStore";
import { getFyersQuote } from "./fyersMarketData";
import { getNiftyLTP } from "./ltpService";
import { getOptionChain } from "../services/marketData";
import { response } from "express";
import { getHistoryData } from "../services/marketData";
import { buildIctContext } from "./ict/context";
import type { OHLCV } from "./broker/types.js";
import { buildPresentation, RawKeyLevel } from "./key-levels"; 
import { getFyersVix } from "./fyersVix"; 
import { getMarketSnapshot } from "./marketSnapshot"; 
import { calculateSmcScore } from "./smcConfluence"; 
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

export async function  generateNiftyData() {

  const nifty = await getFyersQuote();

const snapshot = await getMarketSnapshot();

console.log("Snapshot =", snapshot);
console.log("NIFTY =", nifty);

if (!nifty) {
  throw new Error("NIFTY50 quote not found");
}

if (!nifty) {
  throw new Error("NIFTY50 quote not found");
}
const ltp = snapshot.price;
  console.log("generateNiftyData LTP =", ltp); 
  console.log("getNiftyLTP() =", ltp);
console.log("Snapshot LTP   =", snapshot.price);

const open = snapshot.open;
const dayHigh = snapshot.high;
const dayLow = snapshot.low;
const prevClose = snapshot.previousClose;
const change = r2(ltp - prevClose);
const changePercent = r2((change / prevClose) * 100);

  const now = new Date();
  const h   = now.getHours();
  const marketStatus = h >= 9 && h < 16 ? "OPEN"
    : h === 9 && now.getMinutes() < 15 ? "PRE_OPEN"
    : h >= 16 ? "POST_CLOSE" : "CLOSED";
return {
  ltp,
  open,
  high: dayHigh,
  low: dayLow,
  close: prevClose,

  change,
  changePercent,

  volume: nifty.volume ?? 0,

  dayHigh,
  dayLow,

  previousDayHigh: snapshot.previousDayHigh,
  previousDayLow: snapshot.previousDayLow,

  weekHigh: snapshot.weekHigh,
  weekLow: snapshot.weekLow,

  monthHigh: snapshot.monthHigh,
  monthLow: snapshot.monthLow,

  weekHigh52: snapshot.week52High,
  weekLow52: snapshot.week52Low,

  marketStatus,
  timestamp: new Date().toISOString(),

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

export async function generateSmcAnalysis() {
  const accessToken = getAccessToken();
let candles: OHLCV[] = [];

if (accessToken) {
  try {
    const today = new Date();
    const from = new Date(today);
    from.setDate(today.getDate() - 5);

    const history = await getHistoryData(
      accessToken,
      "NSE:NIFTY50-INDEX",
      "15",
      from.toISOString().slice(0, 10),
      today.toISOString().slice(0, 10)
    );

    console.log("✅ SMC History OK");
    console.log("Candles:", history?.candles?.length ?? 0);
    candles =
  history?.candles?.map(
    ([timestamp, open, high, low, close, volume]: number[]) => ({
      time: new Date(timestamp * 1000).toISOString(),
      open,
      high,
      low,
      close,
      volume,
    })
  ) ?? [];

console.log("OHLCV Candles:", candles.length);

if (candles.length > 0) {
  console.log("First Candle:", candles[0]);
}
  } catch (err) {
    console.error("❌ SMC History Error:", err);
  }
} else {
  console.log("⚠️ No FYERS Access Token");
}
console.log("SMC Final Candles:", candles.length);
  const ltp  = getNiftyLtp();
  

  console.log("========== LAST CANDLE ==========");
console.log(candles[candles.length - 1]);

console.log("========== CURRENT TIME ==========");
console.log(new Date().toISOString());

  const ictContext = buildIctContext(
  candles,
  ltp,
  "15m"
);

  console.log("ICT Summary:", {
  bias: ictContext.currentBias,
  trend: ictContext.trendDirection,
  swings: ictContext.swings.length,
  bos: ictContext.bos.length,
  choch: ictContext.choch.length,
  orderBlocks: ictContext.orderBlocks.length,
  fvgs: ictContext.fvgs.length,
});
console.log("BOS Events:", ictContext.bos);
console.log("First BOS:", ictContext.bos[0]);

console.log("CHOCH Events:", ictContext.choch);
console.log("First CHOCH:", ictContext.choch[0]);

console.log ("Latest Swings:", ictContext.swings.slice(-6));

console.log("Order Blocks:", ictContext.orderBlocks);

console.log("OB Count:", ictContext.orderBlocks.length);
console.log("First OB:", ictContext.orderBlocks[0]);
console.log("Nearest Bullish OB:", ictContext.nearestBullishOB);
console.log("Nearest Bearish OB:", ictContext.nearestBearishOB);


console.log("FVGs:", ictContext.fvgs);

console.log("ICT Keys:", Object.keys(ictContext));
console.log("Liquidity Levels:", ictContext.liquidityLevels);
console.log("Liquidity Sweeps:", ictContext.liquiditySweeps);
console.log("Swings:", ictContext.swings);

  const bull = Math.random() > 0.4;
  const latestHigh =
  [...ictContext.swings]
    .reverse()
    .find(s => s.type === "HIGH");

const latestLow =
  [...ictContext.swings]
    .reverse()
    .find(s => s.type === "LOW");
    console.log("Latest HIGH Swing:", latestHigh);
console.log("Latest LOW Swing :", latestLow);

  const swingHigh = r2(ltp + 80 + Math.random() * 120);
  const swingLow  = r2(ltp - 80 - Math.random() * 120);
  const phases = ["ACCUMULATION","DISTRIBUTION","MARKUP","MARKDOWN","CONSOLIDATION"] as const;

  console.log("Nearest Bullish OB:", ictContext.nearestBullishOB);
console.log("Nearest Bearish OB:", ictContext.nearestBearishOB);

const rankKeyLevel = (level: {
  label: string;
  strength: string;
}) => {
  let score = 0;

  // Strength
  if (level.strength === "STRONG") score += 100;
  else if (level.strength === "MODERATE") score += 60;
  else score += 20;

  // Type Priority
  if (level.label.includes("Order Block")) score += 50;
  else if (level.label.includes("Swing")) score += 40;
  else if (level.label.includes("FVG")) score += 30;

  return score;
};
const keyLevels = [
 
  ...(ictContext.nearestBearishOB
    ? [{
        level: ictContext.nearestBearishOB.top,
        type: "RESISTANCE" as const,
        strength: ictContext.nearestBearishOB.strength,
        label: "Bearish Order Block",
      }]
    : []),

  ...(ictContext.nearestBullishOB
    ? [{
        level: ictContext.nearestBullishOB.bottom,
        type: "SUPPORT" as const,
        strength: ictContext.nearestBullishOB.strength,
        label: "Bullish Order Block",
      }]
    : []),

  ...(ictContext.recentBearishFVG
    ? [{
        level: ictContext.recentBearishFVG.top,
        type: "RESISTANCE" as const,
        strength: "MODERATE" as const,
        label: "Bearish FVG",
      }]
    : []),

  ...(ictContext.recentBullishFVG
    ? [{
        level: ictContext.recentBullishFVG.bottom,
        type: "SUPPORT" as const,
        strength: "MODERATE" as const,
        label: "Bullish FVG",
      }]
    : []),
];

const confluence = calculateSmcScore({
  marketStructure: {
    trend: ictContext.trendDirection,
  },
  bos: ictContext.bos,
  choch: ictContext.choch,
  orderBlocks: ictContext.orderBlocks,
  fairValueGaps: ictContext.fvgs,
});

console.log("SMC Confluence =", confluence); 

  return {
   marketStructure: {
  trend: ictContext.trendDirection,

  higherHigh: ictContext.trendDirection === "UPTREND",
  higherLow: ictContext.trendDirection === "UPTREND",

  lowerHigh: ictContext.trendDirection === "DOWNTREND",
  lowerLow: ictContext.trendDirection === "DOWNTREND",

  currentSwingHigh: latestHigh?.price ?? null,
  currentSwingLow: latestLow?.price ?? null,
  phase: ictContext.marketPhase,
    },
   choch: ictContext.choch.map(c => ({
  type: c.kind,
  level: c.level,
  time: c.time,
  direction: c.direction,
  strength: c.strength,
})),
    bos: ictContext.bos.map(b => ({
  type: b.kind,
  level: b.level,
  time: b.time,
  direction: b.direction,
  strength: b.strength,
})),

  liquidity: {
  buySideLiquidity: ictContext.liquidityLevels
    .filter(l => l.type === "BSL")
    .map(l => l.level),

  sellSideLiquidity: ictContext.liquidityLevels
    .filter(l => l.type === "SSL")
    .map(l => l.level),

  //
  equalHighs: [],
  equalLows: [],

  liquiditySweeps: ictContext.liquiditySweeps.map(s => ({
    level: s.level,
    time: s.time,
    type: s.type,
    swept: s.confirmed,
  })),
},
    orderBlocks: ictContext.orderBlocks.map(ob => ({
  id: ob.id,
  top: ob.top,
  bottom: ob.bottom,
  type: ob.type,
  strength: ob.strength,
  timeframe: ob.timeframe,
  mitigated: ob.mitigated,
  time: ob.time,
})),

fairValueGaps: ictContext.fvgs.map(fvg => ({
  id: fvg.id,
  top: fvg.top,
  bottom: fvg.bottom,
  type: fvg.type,
  filled: fvg.filled,
  fillPercent: fvg.fillPercent,
  time: fvg.time,
})),

  
bias: ictContext.currentBias,
  
keyLevels,  
  
confluence, 

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
export async function generateLiveOptionChain() {
  const response = await getOptionChain("NSE:NIFTY50-INDEX");

  const chain = response.data.optionsChain;

  const spot = chain.find(
    (x: any) => x.symbol === "NSE:NIFTY50-INDEX"
  );

  const strikeMap = new Map<number, any>();

  for (const item of chain) {
    if (item.option_type === "") continue;

    const strike = item.strike_price;

    if (!strikeMap.has(strike)) {
      strikeMap.set(strike, {
        strikePrice: strike,
        call: null,
        put: null,
      });
    }

    const row = strikeMap.get(strike);

    const option = {
      symbol: item.symbol,
      ltp: item.ltp,
      bid: item.bid,
      ask: item.ask,
      oi: item.oi,
      oiChange: item.oich,
      volume: item.volume,
      iv: item.greeks?.iv ?? 0,
      delta: item.greeks?.delta ?? 0,
      gamma: item.greeks?.gamma ?? 0,
      theta: item.greeks?.theta ?? 0,
      vega: item.greeks?.vega ?? 0,
    };

    if (item.option_type === "CE") {
      row.call = option;
    } else if (item.option_type === "PE") {
      row.put = option;
    }
  }

  const strikes = [...strikeMap.values()].sort(
    (a, b) => a.strikePrice - b.strikePrice
  );
return {
  expiry: "",
  spotPrice: spot?.ltp ?? 0,
  totalCallOI: response.data.callOi,
  totalPutOI: response.data.putOi,
  strikes,
  indiavixData: response.data.indiavixData,
};
}


export  async function generateOptionsMetrics(spotPrice: number, expiries: string[]) {
const quotes = await getFyersQuote();
const vix = await getFyersVix();
const indiaVix = vix?.lp ?? 12;

const pcr = 1.00;
const maxPain = Math.round(spotPrice / 50) * 50;
const atm = maxPain;

const totalCallOI = 0;
const totalPutOI = 0; 

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
    expiries,
  };
}
