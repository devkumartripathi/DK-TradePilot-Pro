import { calculateEMA } from "./ema";
import { calculateATR } from "./atr";
import { calculateRSI } from "./rsi";

export interface Candle {
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export function buildIndicators(candles: Candle[]) {
  const close = candles.map(c => c.close);
  const high = candles.map(c => c.high);
  const low = candles.map(c => c.low);

  return {
    ema8: calculateEMA(close, 8),
    ema20: calculateEMA(close, 20),
    ema50: calculateEMA(close, 50),
    ema100: calculateEMA(close, 100),
    atr14: calculateATR(high, low, close, 14),
    rsi14: calculateRSI(close, 14),
  };
}