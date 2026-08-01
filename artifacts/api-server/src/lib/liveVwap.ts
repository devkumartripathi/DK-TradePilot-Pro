import { getBroker } from "./broker/index.js";
import { todayCandles, buildVwapData } from "./ict/indicators.js";

function getTradingDayCandles(candles: any[]) {
  if (candles.length === 0) return [];

  const groups = new Map<string, any[]>();

  for (const c of candles) {
    const day = c.time.slice(0, 10); // YYYY-MM-DD
    if (!groups.has(day)) groups.set(day, []);
    groups.get(day)!.push(c);
  }

  const lastDay = [...groups.keys()].sort().pop();
  return lastDay ? groups.get(lastDay)! : [];
}
export async function getLiveVwap() { 
  console.log("===== LIVE VWAP CALLED =====");
 const broker = await getBroker();

console.log("\n========== VWAP DEBUG ==========");
console.log("Broker Name   :", broker.name);
console.log("Broker Source :", broker.source);

const data = await broker.getMarketData();

console.log("Data Source   :", data.source);
console.log("Spot LTP      :", data.spot.ltp);
console.log("15m Candles   :", data.candles15m.length);
console.log("5m Candles    :", data.candles5m.length);

const today = getTradingDayCandles(data.candles15m);

console.log("Today Candles :", today.length);

if (today.length > 0) {
  console.log("First Candle  :", today[0].time);
  console.log("Last Candle   :", today[today.length - 1].time);
} else {
  console.log("No candles found for today.");
}

console.log("===============================\n");

return buildVwapData(today, data.spot.ltp);
}
