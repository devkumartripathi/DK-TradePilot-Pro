import { getAccessToken } from "./tokenStore";
import { getHistoryData } from "../services/marketData";
import { getFyersQuote } from "./fyersMarketData";

interface DailyCandle {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
} 

export interface MarketSnapshot {
  price: number;

  open: number;
  high: number;
  low: number;
  previousClose: number;

  previousDayHigh: number;
  previousDayLow: number;

  weekHigh: number;
  weekLow: number;

  monthHigh: number;
  monthLow: number;

  week52High: number;
  week52Low: number;

  timestamp: string;
} 

interface DailyCandle {
  time: Date;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}
export interface MarketSnapshot { 
}
export async function getMarketSnapshot(): Promise<MarketSnapshot> {
 
    console.log("✅ getMarketSnapshot() called");

  const accessToken = getAccessToken();

  if (!accessToken) {
    throw new Error("FYERS access token not available");
  }

  const today = new Date();

  // पिछले 1 वर्ष का Daily Data
  const from52 = new Date(today);
  from52.setFullYear(today.getFullYear() - 1);

  const history = await getHistoryData(
    accessToken,
    "NSE:NIFTY50-INDEX",
    "D",
    from52.toISOString().slice(0, 10),
    today.toISOString().slice(0, 10)
  );
// Daily candle type


const candles: DailyCandle[] =
  history?.candles?.map(
    ([timestamp, open, high, low, close, volume]: number[]): DailyCandle => ({
      time: new Date(timestamp * 1000),
      open,
      high,
      low,
      close,
      volume,
    })
  ) ?? [];

// ----------------------------
// Live Quote
// ----------------------------

const quote = await getFyersQuote();
// ----------------------------
// Previous Trading Day
// ----------------------------

const previousDay =
  candles.length >= 2
    ? candles[candles.length - 2]
    : candles[candles.length - 1];

// ----------------------------
// 52 Week High / Low
// ----------------------------

const week52High = Math.max(...candles.map((c) => c.high));
const week52Low = Math.min(...candles.map((c) => c.low));

// ----------------------------
// Current Week
// ----------------------------

const weekStart = new Date(today);

const day = weekStart.getDay();
const diff = day === 0 ? 6 : day - 1;

weekStart.setDate(weekStart.getDate() - diff);
weekStart.setHours(0, 0, 0, 0);

const currentWeek = candles.filter((c) => c.time >= weekStart);

const weekHigh = currentWeek.length
  ? Math.max(...currentWeek.map((c) => c.high))
  : quote?.high_price ?? 0;

const weekLow = currentWeek.length
  ? Math.min(...currentWeek.map((c) => c.low))
  : quote?.low_price ?? 0;

// ----------------------------
// Current Month
// ----------------------------

const currentMonth = candles.filter((c) => {
  return (
    c.time.getMonth() === today.getMonth() &&
    c.time.getFullYear() === today.getFullYear()
  );
});

const monthHigh = currentMonth.length
  ? Math.max(...currentMonth.map((c) => c.high))
  : quote?.high_price ?? 0;

const monthLow = currentMonth.length
  ? Math.min(...currentMonth.map((c) => c.low))
  : quote?.low_price ?? 0;

  return {
    price: quote?.lp ?? 0,

    open: quote?.open_price ?? 0,
    high: quote?.high_price ?? 0,
    low: quote?.low_price ?? 0,
    previousClose: quote?.prev_close_price ?? 0,

    previousDayHigh: previousDay.high,
    previousDayLow: previousDay.low,

    weekHigh,
    weekLow,

    monthHigh,
    monthLow,

    week52High,
    week52Low,

    timestamp: new Date().toISOString(),
  };
}