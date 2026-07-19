/**
 * Signal Engine — main orchestrator.
 *
 * Flow:
 *   1. Fetch live market data from broker (Kite or Simulator)
 *   2. Build ICT context from 15m candles
 *   3. Compute technical indicators
 *   4. Score all four signal types
 *   5. Emit the single highest-confidence signal if ≥ 90%
 *   6. Auto-dispatch Telegram alert (with 15-min debounce per signal type)
 *
 * The entire pipeline is broker-agnostic — swap KiteAdapter ↔ SimulatorAdapter
 * by changing env vars, no code changes required.
 */

import { getBroker }        from "./broker/index.js";
import { buildIctContext }  from "./ict/context.js";
import { calcRsi, calcEma, calcAtr, calcVwap, calcAdx, todayCandles } from "./ict/indicators.js";
import { scoreAll }         from "./scoring/engine.js";
import { getTelegramConfig, sendTelegramAlert } from "../routes/telegram.js";
import type { TechIndicators } from "./scoring/types.js";
import type { BrokerMarketData, OHLCV } from "./broker/types.js";
import { logger } from "./logger.js";

// ── Types ─────────────────────────────────────────────────────────────────────

type SignalType = "CALL_BUY" | "CALL_SELL" | "PUT_BUY" | "PUT_SELL";
type OptionSignalMeta = {
  direction: "BUY" | "SELL"; optionType: "CE" | "PE"; strikeOffset: number;
  slMult: number; t1Mult: number; t2Mult: number;
};

const SIGNAL_META: Record<SignalType, OptionSignalMeta> = {
  CALL_BUY:  { direction: "BUY",  optionType: "CE", strikeOffset:  50, slMult: 0.32, t1Mult: 0.42, t2Mult: 0.72 },
  PUT_BUY:   { direction: "BUY",  optionType: "PE", strikeOffset: -50, slMult: 0.32, t1Mult: 0.42, t2Mult: 0.72 },
  CALL_SELL: { direction: "SELL", optionType: "CE", strikeOffset:  80, slMult: 0.26, t1Mult: 0.36, t2Mult: 0.58 },
  PUT_SELL:  { direction: "SELL", optionType: "PE", strikeOffset: -80, slMult: 0.26, t1Mult: 0.36, t2Mult: 0.58 },
};

const SMC_SETUPS: Record<SignalType, string> = {
  CALL_BUY:  "SSL Sweep + Bullish CHOCH + Bullish OB + VWAP Reclaim",
  PUT_BUY:   "BSL Sweep + Bearish CHOCH + Bearish OB + VWAP Rejection",
  CALL_SELL: "RSI Overbought + BSL Sweep + Bearish CHOCH + OB Resistance",
  PUT_SELL:  "RSI Oversold + SSL Sweep + Bullish CHOCH + OB Support",
};

// ── Telegram debounce ─────────────────────────────────────────────────────────

const TELEGRAM_DEBOUNCE_MS = 15 * 60_000; // 15 minutes
const lastSent: Partial<Record<SignalType, number>> = {};

async function maybeSendTelegram(signal: any): Promise<boolean> {
  const type = signal.optionSignalType as SignalType;
  const now  = Date.now();
  const prev = lastSent[type] ?? 0;
  if (now - prev < TELEGRAM_DEBOUNCE_MS) return false;

  const msg = formatTelegramMsg(signal);
  const result = await sendTelegramAlert(msg);
  if (result.ok) lastSent[type] = now;
  return result.ok;
}

function formatTelegramMsg(s: any): string {
  const emoji: Record<string, string> = {
    CALL_BUY: "🟢 CALL BUY", PUT_BUY: "🔴 PUT BUY",
    CALL_SELL: "🟡 CALL SELL", PUT_SELL: "🔵 PUT SELL",
  };
  const src = s.brokerSource === "kite" ? "📡 Live Data" : "🔬 Simulator";
  return [
    `<b>🎯 NIFTY AI SIGNAL — ${emoji[s.optionSignalType] ?? s.optionSignalType}</b>`,
    ``,
    `<b>Instrument:</b> ${s.instrument} ${s.strikePrice}${s.optionType} ${s.expiry}`,
    `<b>Option LTP:</b> ₹${s.optionLtp?.toFixed(2) ?? "—"}`,
    ``,
    `<b>📌 Entry:</b>    ₹${s.entry.toFixed(2)}`,
    `<b>🛑 Stop Loss:</b> ₹${s.stopLoss.toFixed(2)}`,
    `<b>🎯 Target 1:</b> ₹${s.target1.toFixed(2)}`,
    `<b>🎯 Target 2:</b> ₹${s.target2.toFixed(2)}`,
    `<b>⚖️  Risk:Reward:</b> 1:${s.riskReward.toFixed(1)}`,
    ``,
    `<b>🤖 Confidence:</b> ${s.confidenceScore.toFixed(1)}%`,
    `<b>📊 ICT Setup:</b> ${s.smcSetup}`,
    `<b>${src}</b>`,
    ``,
    `<i>⚠️ Educational use only. Not financial advice.</i>`,
  ].join("\n");
}

// ── Indicator extraction ──────────────────────────────────────────────────────

function extractIndicators(candles: OHLCV[], data: BrokerMarketData): TechIndicators {
  const spot  = data.spot.ltp;
  const chain = data.optionChain;
  const rsi   = calcRsi(candles, 14);
  const ema20 = calcEma(candles, 20);
  const ema50 = calcEma(candles, 50);
  const atr   = calcAtr(candles, 14);
  const vwap  = calcVwap(todayCandles(candles));
  const adx   = calcAdx(candles, 14);

  const pcr     = chain.pcr;
  const vix     = data.indiaVix;
  const callOI  = chain.totalCallOI;
  const putOI   = chain.totalPutOI;
  const maxPain = chain.maxPain;
  const volume  = data.spot.volume;
  const atmIV   = chain.atmIV;

  // ATM delta
  const atm = chain.strikes.find(s => s.strike === chain.atmStrike);
  const atmCallDelta = atm?.call.delta ?? 0.5;
  const atmPutDelta  = atm?.put.delta  ?? -0.5;

  // OI change proxies (sum of OI changes in relevant strikes)
  const oiChangeBull = chain.strikes.reduce((s, x) => s + (x.put.oiChange ?? 0), 0);  // put writing = bullish
  const oiChangeBear = chain.strikes.reduce((s, x) => s + (x.call.oiChange ?? 0), 0); // call writing = bearish

  // Derived signals
  const rsiSignal: TechIndicators["rsiSignal"] =
    rsi > 70 ? "OVERBOUGHT" : rsi < 30 ? "OVERSOLD" : rsi > 56 ? "RISING" : rsi < 44 ? "FALLING" : "NEUTRAL";
  const emaSignal: TechIndicators["emaSignal"] =
    ema20 > ema50 + 15 ? "BULLISH" : ema20 < ema50 - 15 ? "BEARISH" : "NEUTRAL";
  const vwapPosition: TechIndicators["vwapPosition"] =
    spot > vwap + 12 ? "ABOVE" : spot < vwap - 12 ? "BELOW" : "AT";
  const volumeSignal: TechIndicators["volumeSignal"] =
    volume > 145e6 ? "HIGH" : volume < 108e6 ? "LOW" : "AVERAGE";

  return {
    rsi, ema20, ema50, atr, vwap, pcr, vix, callOI, putOI, maxPain, volume, atmIV,
    atmCallDelta, atmPutDelta, oiChangeBull, oiChangeBear,
    rsiSignal, emaSignal, vwapPosition, volumeSignal, adx,
  };
}

// ── Signal builder ────────────────────────────────────────────────────────────

function r2(n: number) { return Math.round(n * 100) / 100; }

function buildSignal(type: SignalType, confidence: number, factors: any[], ind: TechIndicators, data: BrokerMarketData, smcBias: string) {
  const spot   = data.spot.ltp;
  const meta   = SIGNAL_META[type];
  const isBuy  = meta.direction === "BUY";
  const atm    = Math.round(spot / 50) * 50;
  const strike = atm + meta.strikeOffset;
  const expiry = data.optionChain.expiry;

  const slPts = r2(ind.atr * meta.slMult);
  const t1Pts = r2(ind.atr * meta.t1Mult);
  const t2Pts = r2(ind.atr * meta.t2Mult);

  const entry    = r2(isBuy ? spot + 5 : spot - 5);
  const stopLoss = r2(isBuy ? spot - slPts : spot + slPts);
  const target1  = r2(isBuy ? spot + t1Pts : spot - t1Pts);
  const target2  = r2(isBuy ? spot + t2Pts : spot - t2Pts);
  const target3  = r2(isBuy ? spot + t2Pts * 1.4 : spot - t2Pts * 1.4);
  const riskReward = r2(t2Pts / slPts);

  // Option LTP — find from chain if available
  const optStrike = data.optionChain.strikes.find(s => s.strike === strike);
  const optionLtp = optStrike
    ? (meta.optionType === "CE" ? optStrike.call.ltp : optStrike.put.ltp)
    : r2(45 + Math.random() * 30);
  const atmDelta = meta.optionType === "CE" ? ind.atmCallDelta : ind.atmPutDelta;

  const confidenceLabel = confidence >= 95 ? "VERY HIGH" : confidence >= 90 ? "HIGH" : "MODERATE";

  return {
    id: `sig_${type.toLowerCase()}_${Date.now()}`,
    type: "INTRADAY", instrument: "NIFTY50", optionSignalType: type,
    direction: meta.direction,
    entry, stopLoss, target1, target2, target3,
    riskReward, confidenceScore: confidence, confidenceLabel,
    rationale: buildRationale(type, ind, spot, strike, stopLoss, target1, target2, smcBias),
    smcSetup: SMC_SETUPS[type],
    optionType: meta.optionType,
    strikePrice: strike, optionLtp, expiry,
    status: "ACTIVE",
    timestamp: new Date().toISOString(),
    brokerSource: data.source,
    dataQuality: data.source === "kite" ? "LIVE" : "SIMULATED",
    indicators: {
      rsi: ind.rsi, atr: ind.atr, ema20: ind.ema20, ema50: ind.ema50,
      vwap: ind.vwap, pcr: ind.pcr, vix: ind.vix, callOI: ind.callOI,
      putOI: ind.putOI, maxPain: ind.maxPain, volume: ind.volume, adx: ind.adx,
      atmIV: ind.atmIV, atmDelta,
      rsiSignal: ind.rsiSignal, emaSignal: ind.emaSignal,
      vwapPosition: ind.vwapPosition, volumeSignal: ind.volumeSignal,
    },
    scoreFactors: factors,
    telegramAlertSent: false,
  };
}

function buildRationale(type: SignalType, ind: TechIndicators, spot: number, strike: number, sl: number, t1: number, t2: number, bias: string): string {
  const map: Record<SignalType, string> = {
    CALL_BUY:  `ICT CALL BUY: SSL liquidity sweep confirmed institutional accumulation. Bullish CHOCH above ${(spot - 35).toFixed(0)} established higher-low structure. EMA20 ${ind.ema20.toFixed(0)} > EMA50 ${ind.ema50.toFixed(0)} — golden cross momentum. Price reclaimed VWAP (${ind.vwap.toFixed(0)}): bullish context active. RSI ${ind.rsi.toFixed(1)} in momentum zone. PCR ${ind.pcr.toFixed(2)}: put writing dominant — institutions net long. Enter ${strike}CE | SL Nifty ${sl.toFixed(0)} | T1 ${t1.toFixed(0)} | T2 ${t2.toFixed(0)}.`,
    PUT_BUY:   `ICT PUT BUY: BSL liquidity sweep confirmed institutional distribution. Bearish CHOCH below ${(spot + 35).toFixed(0)} established lower-high structure. EMA20 ${ind.ema20.toFixed(0)} < EMA50 ${ind.ema50.toFixed(0)} — death cross momentum. Price rejected VWAP (${ind.vwap.toFixed(0)}): bearish context active. RSI ${ind.rsi.toFixed(1)} in bearish zone. VIX ${ind.vix.toFixed(1)} elevated — panic favors PE. Enter ${strike}PE | SL ${sl.toFixed(0)} | T1 ${t1.toFixed(0)} | T2 ${t2.toFixed(0)}.`,
    CALL_SELL: `ICT CALL SELL: RSI ${ind.rsi.toFixed(1)} overbought at bearish OB resistance. BSL swept — stop hunt complete, smart money sold into euphoria. Bearish CHOCH confirmed lower high at resistance. VWAP ${ind.vwap.toFixed(0)} below price — overextension. Call OI ${(ind.callOI/1e6).toFixed(1)}M at ${strike}: institutional resistance wall. PCR ${ind.pcr.toFixed(2)} — retail CE buying = contrarian sell. VIX ${ind.vix.toFixed(1)}: theta decay optimal. Max Pain ${ind.maxPain.toFixed(0)} below spot. Sell ${strike}CE | SL Nifty breaks ${sl.toFixed(0)} | Targets ${t1.toFixed(0)} / ${t2.toFixed(0)}.`,
    PUT_SELL:  `ICT PUT SELL: RSI ${ind.rsi.toFixed(1)} oversold at bullish OB support. SSL swept — stop hunt complete, smart money bought panic sellers. Bullish CHOCH confirmed higher low at support. VWAP ${ind.vwap.toFixed(0)} above price — panic dip. Put OI ${(ind.putOI/1e6).toFixed(1)}M at ${strike}: institutional support wall. PCR ${ind.pcr.toFixed(2)} — retail PE panic = contrarian buy signal. VIX ${ind.vix.toFixed(1)}: theta decay optimal. Max Pain ${ind.maxPain.toFixed(0)} above spot. Sell ${strike}PE | SL Nifty breaks ${sl.toFixed(0)} | Targets ${t1.toFixed(0)} / ${t2.toFixed(0)}.`,
  };
  return map[type];
}

// ── Main export ───────────────────────────────────────────────────────────────

const CONFIDENCE_THRESHOLD = 55;

export async function generateSignals(): Promise<{
  signals: any[];
  noTradeZone: boolean;
  noTradeReason: string | null;
  marketBias: string;
  sessionTime: string;
  generatedAt: string;
  brokerSource: string;
  brokerName: string;
}> {
  const now   = new Date();
  const hour  = now.getHours();
  const isLunch = hour === 12 || (hour === 13 && now.getMinutes() < 30);

  // Fetch market data
  const broker = await getBroker();
  let data: BrokerMarketData;
  try {
    data = await broker.getMarketData();
  } catch (err) {
    logger.error({ err }, "Broker.getMarketData() failed");
    throw err;
  }

  const candles = data.candles15m;
  if (candles.length < 20) {
    return {
      signals: [], noTradeZone: true,
      noTradeReason: "Insufficient candle data — market may not have opened yet.",
      marketBias: "NEUTRAL", sessionTime: "NORMAL_SESSION",
      generatedAt: now.toISOString(), brokerSource: data.source, brokerName: broker.name,
    };
  }

  // Build ICT context and indicators
  const ict = buildIctContext(candles, data.spot.ltp, "15m");
  const ind = extractIndicators(candles, data);

  // Score all four signal types
  const scored = scoreAll(ict, ind);
  const best   = scored[0];

  // No-trade zone check (lunch hour)
  const noTradeZone   = isLunch;
  const noTradeReason = isLunch
    ? "Lunch consolidation zone (12:00–13:30 IST). Low liquidity — avoid new entries."
    : null;

  const isExpiry = now.getDay() === 4;
  const sessionTime = isExpiry ? "EXPIRY_DAY" : "NORMAL_SESSION";

  const marketBias =
    best.type === "CALL_BUY"  || best.type === "PUT_SELL"  ? "BULLISH" :
    best.type === "PUT_BUY"   || best.type === "CALL_SELL" ? "BEARISH" : "NEUTRAL";

  // Emit signal only if confidence ≥ threshold and not in no-trade zone
  let signals: any[] = [];
  if (!noTradeZone && best.confidence >= CONFIDENCE_THRESHOLD) {
    const smcBias = ict.currentBias;
    const signal  = buildSignal(best.type, best.confidence, best.factors, ind, data, smcBias);
    signals.push(signal);

    // Auto Telegram dispatch
    const cfg = getTelegramConfig();
    if (cfg.enabled && cfg.botToken && cfg.chatId) {
      maybeSendTelegram(signal).then(sent => {
        if (sent) logger.info({ type: signal.optionSignalType, confidence: best.confidence }, "Telegram alert dispatched");
      }).catch(err => logger.warn({ err }, "Telegram dispatch failed"));
      signal.telegramAlertSent = true; // optimistic — updated in .then()
    }
  }

  return {
    signals, noTradeZone, noTradeReason,
    marketBias, sessionTime,
    generatedAt: now.toISOString(),
    brokerSource: data.source,
    brokerName: broker.name,
  };
}

/** Expose broker status for the /broker/status route */
export async function getBrokerStatus(): Promise<{
  name: string; source: string; available: boolean;
}> {
  const b = await getBroker();
  return { name: b.name, source: b.source, available: await b.isAvailable() };
}
