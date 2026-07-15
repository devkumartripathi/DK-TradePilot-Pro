/**
 * Shared data types for the broker adapter layer.
 * All broker adapters (Kite, Simulator, etc.) must produce these shapes.
 */

export interface OHLCV {
  time: string;   // ISO-8601
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  oi?: number;    // open interest (from futures/options)
}

export interface OptionStrike {
  strike: number;
  call: {
    tradingsymbol: string;
    ltp: number;
    iv: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    oi: number;
    oiChange: number;     // OI change from previous day
    volume: number;
    bidPrice: number;
    askPrice: number;
  };
  put: {
    tradingsymbol: string;
    ltp: number;
    iv: number;
    delta: number;
    gamma: number;
    theta: number;
    vega: number;
    oi: number;
    oiChange: number;
    volume: number;
    bidPrice: number;
    askPrice: number;
  };
}

export interface OptionChainData {
  expiry: string;
  spotPrice: number;
  atmStrike: number;
  atmIV: number;               // ATM Implied Volatility
  strikes: OptionStrike[];
  totalCallOI: number;
  totalPutOI: number;
  pcr: number;                 // Put-Call Ratio
  maxPain: number;             // Max Pain strike
}

export interface SpotQuote {
  ltp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  change: number;
  changePercent: number;
}

export interface BrokerMarketData {
  spot: SpotQuote;
  candles15m: OHLCV[];     // 15-min candles, last ~100 (for ICT structure)
  candles5m: OHLCV[];      // 5-min candles, last ~100 (for finer structure)
  optionChain: OptionChainData;
  indiaVix: number;
  timestamp: string;
  source: "kite" | "simulator";
}
