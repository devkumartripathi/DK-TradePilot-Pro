/**
 * Market data simulator for Nifty 50 trading signals.
 * Produces realistic, time-consistent simulated data.
 */

// Base Nifty price that drifts slowly
let baseNifty = 24580.35;
let lastTick = Date.now();

function drift(value: number, maxPct: number = 0.0015): number {
  const d = (Math.random() - 0.48) * value * maxPct;
  return value + d;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round0(n: number): number {
  return Math.round(n);
}

export function getNiftyLtp(): number {
  const now = Date.now();
  const elapsed = (now - lastTick) / 1000;
  if (elapsed > 2) {
    baseNifty = drift(baseNifty, 0.001);
    lastTick = now;
  }
  return round2(baseNifty);
}

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
  const marketStatus = isOpen ? "OPEN" : hour === 9 && now.getMinutes() < 15 ? "PRE_OPEN" : hour >= 16 ? "POST_CLOSE" : "CLOSED";

  return {
    ltp,
    open,
    high: dayHigh,
    low: dayLow,
    close,
    change,
    changePercent,
    volume: round0(125000000 + Math.random() * 50000000),
    dayHigh,
    dayLow,
    weekHigh52: round2(24968.70),
    weekLow52: round2(19426.35),
    marketStatus,
    timestamp: new Date().toISOString(),
    trend: changePercent > 0.3 ? "BULLISH" : changePercent < -0.3 ? "BEARISH" : "NEUTRAL",
  };
}

export function generateCandles(timeframe: string, limit: number) {
  const candles = [];
  const intervals: Record<string, number> = {
    "1m": 60000,
    "5m": 300000,
    "15m": 900000,
    "1h": 3600000,
    "1d": 86400000,
  };
  const ms = intervals[timeframe] ?? 300000;
  let price = baseNifty;
  const now = Date.now();

  for (let i = limit; i >= 0; i--) {
    const time = new Date(now - i * ms);
    const open = round2(price);
    const move = (Math.random() - 0.48) * price * 0.004;
    const close = round2(open + move);
    const highExtra = Math.random() * Math.abs(move) * 0.5;
    const lowExtra = Math.random() * Math.abs(move) * 0.5;
    const high = round2(Math.max(open, close) + highExtra);
    const low = round2(Math.min(open, close) - lowExtra);
    const volume = round0(800000 + Math.random() * 1200000);
    candles.push({ time: time.toISOString(), open, high, low, close, volume });
    price = close;
  }

  return candles;
}

export function generateVwap() {
  const ltp = getNiftyLtp();
  const vwap = round2(ltp - (Math.random() - 0.5) * 40);
  const std = round2(30 + Math.random() * 20);
  return {
    vwap,
    upperBand1: round2(vwap + std),
    upperBand2: round2(vwap + std * 2),
    lowerBand1: round2(vwap - std),
    lowerBand2: round2(vwap - std * 2),
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

  const bosEvents = [
    {
      type: "BOS",
      level: round2(ltp - 50 - Math.random() * 50),
      time: new Date(Date.now() - 45 * 60000).toISOString(),
      direction: "BULLISH" as const,
      strength: "STRONG" as const,
    },
    {
      type: "BOS",
      level: round2(ltp + 30 + Math.random() * 40),
      time: new Date(Date.now() - 20 * 60000).toISOString(),
      direction: isUptrend ? "BULLISH" as const : "BEARISH" as const,
      strength: Math.random() > 0.5 ? "STRONG" as const : "WEAK" as const,
    },
  ];

  const chochEvents = [
    {
      type: "CHOCH",
      level: round2(ltp + (isUptrend ? -80 : 80) + Math.random() * 30),
      time: new Date(Date.now() - 90 * 60000).toISOString(),
      direction: isUptrend ? "BULLISH" as const : "BEARISH" as const,
      strength: "STRONG" as const,
    },
  ];

  const orderBlocks = [
    {
      id: "ob1",
      top: round2(ltp - 120 + Math.random() * 20),
      bottom: round2(ltp - 145 + Math.random() * 20),
      type: "BULLISH" as const,
      strength: "STRONG" as const,
      timeframe: "15m",
      mitigated: false,
      time: new Date(Date.now() - 120 * 60000).toISOString(),
    },
    {
      id: "ob2",
      top: round2(ltp + 150 + Math.random() * 30),
      bottom: round2(ltp + 130 + Math.random() * 30),
      type: "BEARISH" as const,
      strength: "MODERATE" as const,
      timeframe: "1h",
      mitigated: false,
      time: new Date(Date.now() - 240 * 60000).toISOString(),
    },
    {
      id: "ob3",
      top: round2(ltp - 60 + Math.random() * 10),
      bottom: round2(ltp - 80 + Math.random() * 10),
      type: "BULLISH" as const,
      strength: "WEAK" as const,
      timeframe: "5m",
      mitigated: true,
      time: new Date(Date.now() - 30 * 60000).toISOString(),
    },
  ];

  const fairValueGaps = [
    {
      id: "fvg1",
      top: round2(ltp - 20),
      bottom: round2(ltp - 35),
      type: "BULLISH" as const,
      filled: false,
      fillPercent: round2(Math.random() * 30),
      time: new Date(Date.now() - 15 * 60000).toISOString(),
    },
    {
      id: "fvg2",
      top: round2(ltp + 60),
      bottom: round2(ltp + 45),
      type: "BEARISH" as const,
      filled: true,
      fillPercent: 100,
      time: new Date(Date.now() - 60 * 60000).toISOString(),
    },
    {
      id: "fvg3",
      top: round2(ltp - 90),
      bottom: round2(ltp - 110),
      type: "BULLISH" as const,
      filled: false,
      fillPercent: round2(40 + Math.random() * 30),
      time: new Date(Date.now() - 180 * 60000).toISOString(),
    },
  ];

  const keyLevels = [
    { level: round2(ltp + 150), type: "RESISTANCE" as const, strength: "STRONG" as const, label: "Weekly High" },
    { level: round2(ltp + 75), type: "RESISTANCE" as const, strength: "MODERATE" as const, label: "Daily Resistance" },
    { level: round2(ltp - 85), type: "SUPPORT" as const, strength: "STRONG" as const, label: "Daily Support" },
    { level: round2(ltp - 200), type: "SUPPORT" as const, strength: "STRONG" as const, label: "Weekly Low" },
    { level: round2(ltp + 20), type: "PIVOT" as const, strength: "MODERATE" as const, label: "CPR" },
  ];

  const bslLevels = [round2(ltp + 100), round2(ltp + 180), round2(swingHigh)];
  const sslLevels = [round2(ltp - 90), round2(ltp - 170), round2(swingLow)];

  return {
    marketStructure: {
      trend: isUptrend ? "UPTREND" as const : Math.random() > 0.5 ? "DOWNTREND" as const : "SIDEWAYS" as const,
      higherHigh: isUptrend,
      higherLow: isUptrend,
      lowerHigh: !isUptrend,
      lowerLow: !isUptrend,
      currentSwingHigh: swingHigh,
      currentSwingLow: swingLow,
      phase,
    },
    bos: bosEvents,
    choch: chochEvents,
    liquidity: {
      buySideLiquidity: bslLevels,
      sellSideLiquidity: sslLevels,
      equalHighs: [round2(swingHigh - 10), round2(swingHigh - 5)],
      equalLows: [round2(swingLow + 8), round2(swingLow + 3)],
      liquiditySweeps: [
        {
          level: round2(ltp - 110),
          time: new Date(Date.now() - 40 * 60000).toISOString(),
          type: "SSL_SWEEP" as const,
          swept: true,
        },
      ],
    },
    orderBlocks,
    fairValueGaps,
    bias,
    keyLevels,
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

    const callLtp = callItm
      ? round2(spotPrice - strike + 15 + Math.random() * 10)
      : round2(Math.max(1, (80 - moneyness * 12) + (Math.random() - 0.5) * 20));
    const putLtp = putItm
      ? round2(strike - spotPrice + 15 + Math.random() * 10)
      : round2(Math.max(1, (80 - moneyness * 12) + (Math.random() - 0.5) * 20));

    const callIv = round2(12 + moneyness * 1.5 + Math.random() * 3);
    const putIv = round2(13 + moneyness * 1.5 + Math.random() * 3);

    const callOi = round0((isAtm ? 8000000 : 5000000 - moneyness * 400000 + Math.random() * 500000) * Math.random() * 0.3 + (isAtm ? 6000000 : 3000000));
    const putOi = round0((isAtm ? 9000000 : 5500000 - moneyness * 350000 + Math.random() * 500000) * Math.random() * 0.3 + (isAtm ? 7000000 : 3500000));

    strikes.push({
      strikePrice: strike,
      call: {
        ltp: callLtp,
        iv: callIv,
        delta: round2(callItm ? 0.7 + Math.random() * 0.2 : 0.5 - moneyness * 0.08 + Math.random() * 0.05),
        gamma: round2(isAtm ? 0.004 : 0.002 - moneyness * 0.0001),
        theta: round2(-(isAtm ? 12 : 8 - moneyness * 0.5) - Math.random() * 3),
        vega: round2(isAtm ? 45 : 35 - moneyness * 3 + Math.random() * 5),
        oi: callOi,
        oiChange: round0((Math.random() - 0.4) * callOi * 0.1),
        volume: round0(callOi * 0.15 * Math.random()),
        bidPrice: round2(callLtp - 0.5),
        askPrice: round2(callLtp + 0.5),
      },
      put: {
        ltp: putLtp,
        iv: putIv,
        delta: round2(putItm ? -(0.7 + Math.random() * 0.2) : -(0.5 - moneyness * 0.08 + Math.random() * 0.05)),
        gamma: round2(isAtm ? 0.004 : 0.002 - moneyness * 0.0001),
        theta: round2(-(isAtm ? 12 : 8 - moneyness * 0.5) - Math.random() * 3),
        vega: round2(isAtm ? 45 : 35 - moneyness * 3 + Math.random() * 5),
        oi: putOi,
        oiChange: round0((Math.random() - 0.4) * putOi * 0.1),
        volume: round0(putOi * 0.15 * Math.random()),
        bidPrice: round2(putLtp - 0.5),
        askPrice: round2(putLtp + 0.5),
      },
    });
  }

  const totalCallOI = strikes.reduce((s, x) => s + x.call.oi, 0);
  const totalPutOI = strikes.reduce((s, x) => s + x.put.oi, 0);

  // Next few weekly expiries
  const expiries = getExpiries();

  return {
    expiry: expiries[0],
    spotPrice,
    strikes,
    totalCallOI,
    totalPutOI,
  };
}

function getExpiries(): string[] {
  const expiries: string[] = [];
  const now = new Date();
  // Find next 4 Thursdays
  let d = new Date(now);
  let found = 0;
  while (found < 4) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() === 4) { // Thursday
      expiries.push(d.toISOString().slice(0, 10));
      found++;
    }
  }
  return expiries;
}

export function generateOptionsMetrics(spotPrice: number) {
  const pcr = round2(0.7 + Math.random() * 0.9); // 0.7 to 1.6
  const pcrSignal = pcr > 1.2 ? "BULLISH" : pcr < 0.8 ? "BEARISH" : "NEUTRAL";
  const atmStrike = Math.round(spotPrice / 50) * 50;
  const maxPain = round2(atmStrike - 50 + Math.round(Math.random() * 4) * 50);
  const indiaVix = round2(12 + Math.random() * 8);
  const vixChange = round2((Math.random() - 0.5) * 2);
  const vixSignal = indiaVix > 18 ? "HIGH_VOLATILITY" : indiaVix < 14 ? "LOW_VOLATILITY" : "NORMAL";
  const totalCallOI = round0(80000000 + Math.random() * 30000000);
  const totalPutOI = round0(totalCallOI * pcr);

  return {
    pcr,
    pcrSignal: pcrSignal as "BULLISH" | "BEARISH" | "NEUTRAL",
    maxPain,
    indiaVix,
    vixChange,
    vixSignal: vixSignal as "HIGH_VOLATILITY" | "LOW_VOLATILITY" | "NORMAL",
    totalCallOI,
    totalPutOI,
    oiRatio: round2(totalPutOI / totalCallOI),
    putCallBuildupSignal: pcr > 1.1 ? "Put Writing (Bullish)" : pcr < 0.9 ? "Call Writing (Bearish)" : "Mixed OI Activity",
    supportLevel: round2(spotPrice - 100 - Math.random() * 100),
    resistanceLevel: round2(spotPrice + 100 + Math.random() * 100),
    expiries: getExpiries(),
  };
}

export function generateTradeSignals(spotPrice: number) {
  const now = new Date();
  const hour = now.getHours();
  const isMarketHours = hour >= 9 && hour < 16;
  const isLunchZone = hour === 12 || (hour === 13 && now.getMinutes() < 30);
  const isExpiry = now.getDay() === 4; // Thursday

  const noTradeZone = isLunchZone || (!isMarketHours);
  const noTradeReason = !isMarketHours
    ? "Market is closed. No trade zone active."
    : isLunchZone
    ? "Lunch hour consolidation zone (12:00–13:30 IST). Low liquidity — avoid new entries."
    : null;

  const atmStrike = Math.round(spotPrice / 50) * 50;
  const isUpBias = Math.random() > 0.4;

  const signals = noTradeZone ? [] : [
    {
      id: "sig1",
      type: "INTRADAY" as const,
      instrument: "NIFTY50",
      direction: isUpBias ? "BUY" as const : "SELL" as const,
      entry: isUpBias ? round2(spotPrice + 10) : round2(spotPrice - 10),
      stopLoss: isUpBias ? round2(spotPrice - 45) : round2(spotPrice + 45),
      target1: isUpBias ? round2(spotPrice + 55) : round2(spotPrice - 55),
      target2: isUpBias ? round2(spotPrice + 95) : round2(spotPrice - 95),
      target3: isUpBias ? round2(spotPrice + 145) : round2(spotPrice - 145),
      riskReward: 3.2,
      confidenceScore: round2(72 + Math.random() * 15),
      confidenceLabel: "HIGH" as const,
      rationale: isUpBias
        ? "Bullish BOS confirmed above 24580 with strong momentum. OB at 24490-24510 providing support. VWAP reclaimed — expecting continuation toward 24650."
        : "Bearish CHOCH at 24620 with rejection from OB. Call writers at 24700CE absorbing. VIX uptick supports downside momentum.",
      smcSetup: isUpBias ? "Bullish OB + BOS + FVG Fill" : "Bearish CHOCH + OB Rejection",
      optionType: isUpBias ? "CE" as const : "PE" as const,
      strikePrice: isUpBias ? atmStrike + 100 : atmStrike - 100,
      expiry: getExpiries()[0],
      status: "ACTIVE" as const,
      timestamp: new Date().toISOString(),
    },
    {
      id: "sig2",
      type: "INTRADAY" as const,
      instrument: "NIFTY50",
      direction: isUpBias ? "SELL" as const : "BUY" as const,
      entry: isUpBias ? round2(spotPrice + 150) : round2(spotPrice - 150),
      stopLoss: isUpBias ? round2(spotPrice + 195) : round2(spotPrice - 195),
      target1: isUpBias ? round2(spotPrice + 100) : round2(spotPrice - 100),
      target2: isUpBias ? round2(spotPrice + 60) : round2(spotPrice - 60),
      target3: isUpBias ? round2(spotPrice + 20) : round2(spotPrice - 20),
      riskReward: 2.8,
      confidenceScore: round2(58 + Math.random() * 10),
      confidenceLabel: "MODERATE" as const,
      rationale: isUpBias
        ? "Bearish OB at 24730-24760 with heavy call OI concentration. Resistance zone from daily timeframe. Fade the resistance for short scalp."
        : "Support OB at 24380-24410. SSL swept below 24400 — reversal play targeting FVG fill at 24490.",
      smcSetup: isUpBias ? "Bearish OB + Resistance Sell" : "SSL Sweep + Reversal",
      optionType: isUpBias ? "PE" as const : "CE" as const,
      strikePrice: isUpBias ? atmStrike + 150 : atmStrike - 150,
      expiry: getExpiries()[0],
      status: "ACTIVE" as const,
      timestamp: new Date(Date.now() - 20 * 60000).toISOString(),
    },
    {
      id: "sig3",
      type: "INTRADAY" as const,
      instrument: "NIFTY50",
      direction: isUpBias ? "BUY" as const : "SELL" as const,
      entry: round2(spotPrice),
      stopLoss: isUpBias ? round2(spotPrice - 30) : round2(spotPrice + 30),
      target1: isUpBias ? round2(spotPrice + 35) : round2(spotPrice - 35),
      target2: isUpBias ? round2(spotPrice + 65) : round2(spotPrice - 65),
      target3: isUpBias ? round2(spotPrice + 100) : round2(spotPrice - 100),
      riskReward: 3.5,
      confidenceScore: round2(82 + Math.random() * 10),
      confidenceLabel: "VERY HIGH" as const,
      rationale: isUpBias
        ? "Triple confluence: Bullish FVG fill + VWAP support + 15m OB. PCR > 1.2 with Put writing dominant. Max Pain at 24600 acting as magnet."
        : "ICT Optimal Trade Entry (OTE) at 0.618 fib level inside bearish OB. CHOCH confirmed on 5m. India VIX rising — momentum favors sellers.",
      smcSetup: isUpBias ? "FVG + VWAP + OB Triple Confluence" : "OTE + CHOCH + Rising VIX",
      optionType: isUpBias ? "CE" as const : "PE" as const,
      strikePrice: isUpBias ? atmStrike + 50 : atmStrike - 50,
      expiry: getExpiries()[0],
      status: "ACTIVE" as const,
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
    },
  ];

  return {
    signals,
    noTradeZone,
    noTradeReason,
    marketBias: isUpBias ? "BULLISH" as const : "BEARISH" as const,
    sessionTime: isExpiry ? "EXPIRY_DAY" : "NORMAL_SESSION",
    generatedAt: new Date().toISOString(),
  };
}
