import type { BrokerAdapter } from "./adapter.js";
import type { BrokerMarketData } from "./types.js";
import { getFyersQuote } from "../fyersMarketData.js";
import { getHistoryData } from "../../services/marketData.js";
import { generateLiveOptionChain } from "../marketData.js";
import { mapFyersOptionChain } from "./fyersMapper.js";
import { getAccessToken } from "../tokenStore.js";

export class FyersAdapter implements BrokerAdapter {
  readonly name = "FYERS";
  readonly source = "fyers" as const;

  async isAvailable(): Promise<boolean> {
  try {
    const quote = await getFyersQuote();

console.log("========== FYERS QUOTE ==========");
console.dir(quote, { depth: null });
console.log("================================");

    return quote !== null;
  } catch {
    return false;
  }
}
async getMarketData(): Promise<BrokerMarketData> {
  const quote = await getFyersQuote();

  if (!quote) {
    throw new Error("FYERS quote unavailable");
  }

 const token = getAccessToken();

if (!token) {
  throw new Error("FYERS access token not available");
}
let history: any = { candles: [] };

  const rangeTo = new Date();

  const rangeFrom = new Date();
  rangeFrom.setDate(rangeTo.getDate() - 15);

  const from = rangeFrom.toISOString().split("T")[0];
  const to = rangeTo.toISOString().split("T")[0];

  history = await getHistoryData(
    token,
    "NSE:NIFTY50-INDEX",
    "15",
    from,
    to
  );

  console.log("History Range:", from, "→", to);
  console.log("Candles:", history?.candles?.length ?? 0);

  if (!history?.candles?.length) {
    throw new Error(
      `No historical candles found between ${from} and ${to}.`
    );
  }

if (!history?.candles?.length) {
  throw new Error("No historical candles found in last 7 days.");
}

console.dir(history, { depth: null });

  const optionChain = await generateLiveOptionChain();

  const mappedOptionChain = mapFyersOptionChain(optionChain);
  const candles15m = history.candles.map((c: any) => ({
  time: new Date(c[0] * 1000).toISOString(),
  open: c[1],
  high: c[2],
  low: c[3],
  close: c[4],
  volume: c[5],
}));

console.log("15m Candles:", candles15m.length);

console.log("========== RETURN DATA ==========");
console.log({
  spot: {
    ltp: quote.ltp,
    open: quote.open_price,
    high: quote.high_price,
    low: quote.low_price,
    close: quote.prev_close_price,
    volume: quote.vol_traded_today,
    change: quote.ch,
    changePercent: quote.chp,
  },
  candles: candles15m.length,
  optionSpot: mappedOptionChain.spotPrice,

});


console.log("================================");

  return {
  spot: {
  ltp: quote.lp,
  open: quote.open_price,
  high: quote.high_price,
  low: quote.low_price,
  close: quote.prev_close_price,
  volume: quote.volume,
  change: quote.ch,
  changePercent: quote.chp,
},

  candles15m,

  // 
  candles5m: candles15m,

  optionChain: mappedOptionChain,

  indiaVix: optionChain.indiavixData?.ltp?? 12,

  timestamp: new Date().toISOString(),

  source: "fyers",
};

}
}