/**
 * Zerodha Kite Connect Broker Adapter
 *
 * Uses the Kite REST API v3 directly via fetch() — no npm package needed.
 * Docs: https://kite.trade/docs/connect/v3/
 *
 * Required Secrets (set in Replit Secrets):
 *   KITE_API_KEY      — your Kite Connect API key
 *   KITE_ACCESS_TOKEN — session access token (refresh daily after login)
 *
 * DAILY TOKEN REFRESH:
 *   1. Direct user to: https://kite.trade/connect/login?api_key=YOUR_KEY&v=3
 *   2. On redirect, extract `request_token` from URL
 *   3. POST /session/token with api_key, request_token, checksum
 *   4. Store returned access_token as KITE_ACCESS_TOKEN secret
 *   (Or use the /api/signals/broker/refresh-token route added below)
 */

import type { BrokerAdapter } from "./adapter.js";
import type { BrokerMarketData, OHLCV, OptionStrike, OptionChainData } from "./types.js";
import { logger } from "../logger.js";

// ── Kite API constants ────────────────────────────────────────────────────────

const BASE_URL = "https://api.kite.trade";
const KITE_VERSION = "3";
const NIFTY_TOKEN = "256265";    // NSE:NIFTY 50 instrument token
const NIFTY_NAME  = "NIFTY";

// Month char encoding used in Kite's weekly option symbols
const MONTH_CHARS: Record<number, string> = {
  1: "1", 2: "2", 3: "3", 4: "4", 5: "5", 6: "6",
  7: "7", 8: "8", 9: "9", 10: "O", 11: "N", 12: "D",
};

// ── Instruments cache ─────────────────────────────────────────────────────────

interface KiteInstrument {
  instrument_token: number;
  tradingsymbol: string;
  name: string;
  expiry: string;    // YYYY-MM-DD
  strike: number;
  instrument_type: string;  // CE | PE | FUT | EQ
  exchange: string;
  lot_size: number;
}

let instrumentCache: KiteInstrument[] | null = null;
let instrumentCacheAt = 0;
const CACHE_TTL = 22 * 60 * 60 * 1000; // 22 hours

// ── Adapter ───────────────────────────────────────────────────────────────────

export class KiteAdapter implements BrokerAdapter {
  readonly name = "Zerodha Kite Connect";
  readonly source = "kite" as const;

  private apiKey: string;
  private accessToken: string;

  constructor() {
    this.apiKey      = process.env.KITE_API_KEY      ?? "";
    this.accessToken = process.env.KITE_ACCESS_TOKEN ?? "";
  }

  async isAvailable(): Promise<boolean> {
    if (!this.apiKey || !this.accessToken) return false;
    try {
      // Quick profile check
      const res = await this.fetch("/user/profile");
      return res.status === "success";
    } catch {
      return false;
    }
  }

  // ── Main data fetch ─────────────────────────────────────────────────────────

  async getMarketData(): Promise<BrokerMarketData> {
    const [spotQuote, candles15m, candles5m, vix] = await Promise.all([
      this.getSpotQuote(),
      this.getCandles(NIFTY_TOKEN, "15minute", daysAgo(5)),
      this.getCandles(NIFTY_TOKEN, "5minute",  daysAgo(2)),
      this.getVix(),
    ]);

    const spot = spotQuote.data[`NSE:${NIFTY_NAME} 50`] ?? spotQuote.data["NSE:NIFTY 50"];
    const ltp = spot.last_price;
    const atmStrike = Math.round(ltp / 50) * 50;

    const optionChain = await this.getOptionChain(ltp, atmStrike);

    return {
      spot: {
        ltp,
        open:   spot.ohlc.open,
        high:   spot.ohlc.high,
        low:    spot.ohlc.low,
        close:  spot.ohlc.close,
        volume: spot.volume,
        change: spot.net_change,
        changePercent: r2((spot.net_change / spot.ohlc.close) * 100),
      },
      candles15m,
      candles5m,
      optionChain,
      indiaVix: vix,
      timestamp: new Date().toISOString(),
      source: "kite",
    };
  }

  // ── Spot quote ──────────────────────────────────────────────────────────────

  private async getSpotQuote() {
    return this.fetch("/quote?i=NSE%3ANIFTY+50");
  }

  // ── VIX ────────────────────────────────────────────────────────────────────

  private async getVix(): Promise<number> {
    try {
      const data = await this.fetch("/quote?i=NSE%3AINDIA+VIX");
      return data.data["NSE:INDIA VIX"]?.last_price ?? 15;
    } catch {
      return 15;
    }
  }

  // ── Historical candles ──────────────────────────────────────────────────────

  private async getCandles(token: string, interval: string, from: Date): Promise<OHLCV[]> {
    const to  = new Date();
    const f   = formatKiteDate(from);
    const t   = formatKiteDate(to);
    const url = `/instruments/historical/${token}/${interval}?from=${encodeURIComponent(f)}&to=${encodeURIComponent(t)}&continuous=0&oi=1`;
    const data = await this.fetch(url);
    return (data.data?.candles ?? []).map(([time, open, high, low, close, volume, oi]: any) => ({
      time: typeof time === "string" ? time : new Date(time).toISOString(),
      open: +open, high: +high, low: +low, close: +close, volume: +volume, oi: +oi,
    }));
  }

  // ── Option chain ────────────────────────────────────────────────────────────

  private async getOptionChain(spot: number, atmStrike: number): Promise<OptionChainData> {
    const instruments = await this.getNiftyOptionInstruments();
    const expiry = nearestExpiry(instruments);
    if (!expiry) throw new Error("No NIFTY option expiry found");

    // Build strike range: ATM ± 10 strikes × 50
    const strikePrices: number[] = [];
    for (let i = -10; i <= 10; i++) strikePrices.push(atmStrike + i * 50);

    // Find matching instruments
    const symbols: string[] = [];
    const strikeMap = new Map<string, { strike: number; type: "CE" | "PE"; symbol: string }>();

    for (const strike of strikePrices) {
      for (const otype of ["CE", "PE"] as const) {
        const inst = instruments.find(
          i => i.expiry === expiry && i.strike === strike && i.instrument_type === otype
        );
        if (inst) {
          const sym = `NFO:${inst.tradingsymbol}`;
          symbols.push(sym);
          strikeMap.set(sym, { strike, type: otype, symbol: sym });
        }
      }
    }

    if (!symbols.length) throw new Error("No option symbols found");

    // Batch quote (Kite allows up to 500 symbols per request)
    const queryStr = symbols.map(s => `i=${encodeURIComponent(s)}`).join("&");
    const quoteData = await this.fetch(`/quote?${queryStr}`);
    const quotes = quoteData.data ?? {};

    // Assemble option chain
    const strikeObjects = new Map<number, Partial<OptionStrike>>();
    let totalCallOI = 0, totalPutOI = 0;

    for (const [sym, meta] of strikeMap.entries()) {
      const q = quotes[sym];
      if (!q) continue;
      const { strike, type } = meta;

      if (!strikeObjects.has(strike)) {
        strikeObjects.set(strike, { strike, call: undefined as any, put: undefined as any });
      }
      const entry = strikeObjects.get(strike)!;

      const depth = q.depth ?? {};
      const bid = depth.buy?.[0]?.price ?? q.last_price - 0.5;
      const ask = depth.sell?.[0]?.price ?? q.last_price + 0.5;
      const ohlc = q.ohlc ?? {};

      const optData = {
        tradingsymbol: sym.replace("NFO:", ""),
        ltp: q.last_price,
        iv: q.implied_volatility ?? estimateIV(q.last_price, spot, strike, type),
        delta:  type === "CE" ? estimateDelta(spot, strike, "CE") : estimateDelta(spot, strike, "PE"),
        gamma:  0.003,
        theta:  -(q.last_price * 0.005),
        vega:   q.last_price * 0.1,
        oi: q.oi ?? 0,
        oiChange: q.oi_day_high ? q.oi - (q.oi_day_low ?? 0) : 0,
        volume: q.volume ?? 0,
        bidPrice: r2(bid),
        askPrice: r2(ask),
      };

      if (type === "CE") { entry.call = optData; totalCallOI += optData.oi; }
      else               { entry.put  = optData; totalPutOI  += optData.oi; }
    }

    // Max Pain calculation
    const strikeList = [...strikeObjects.entries()]
      .filter(([, v]) => v.call && v.put)
      .map(([strike, v]) => ({ strike, call: v.call!, put: v.put! })) as OptionStrike[];

    const maxPain = calcMaxPain(strikeList);
    const pcr = totalCallOI > 0 ? r2(totalPutOI / totalCallOI) : 1;
    const atmOpt = strikeObjects.get(atmStrike);
    const atmIV  = atmOpt?.call?.iv ?? 15;

    return {
      expiry,
      spotPrice: spot,
      atmStrike,
      atmIV,
      strikes: strikeList.sort((a, b) => a.strike - b.strike),
      totalCallOI,
      totalPutOI,
      pcr,
      maxPain,
    };
  }

  // ── Instruments ─────────────────────────────────────────────────────────────

  private async getNiftyOptionInstruments(): Promise<KiteInstrument[]> {
    if (instrumentCache && Date.now() - instrumentCacheAt < CACHE_TTL) {
      return instrumentCache;
    }
    const res = await this.fetchRaw("/instruments/NFO");
    const text = await res.text();
    const instruments = parseInstrumentsCSV(text).filter(
      i => i.name === NIFTY_NAME && (i.instrument_type === "CE" || i.instrument_type === "PE")
    );
    instrumentCache = instruments;
    instrumentCacheAt = Date.now();
    return instruments;
  }

  // ── HTTP helper ─────────────────────────────────────────────────────────────

  private headers() {
    return {
      "Authorization": `token ${this.apiKey}:${this.accessToken}`,
      "X-Kite-Version": KITE_VERSION,
      "Content-Type": "application/json",
    };
  }

  private async fetchRaw(path: string): Promise<Response> {
    const res = await fetch(`${BASE_URL}${path}`, { headers: this.headers() });
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      throw new Error(`Kite API ${path} → ${res.status}: ${text}`);
    }
    return res;
  }

  private async fetch(path: string): Promise<any> {
    const res = await this.fetchRaw(path);
    return res.json();
  }
}

// ── Pure helpers ──────────────────────────────────────────────────────────────

function r2(n: number) { return Math.round(n * 100) / 100; }

function daysAgo(n: number): Date {
  return new Date(Date.now() - n * 86400_000);
}

function formatKiteDate(d: Date): string {
  // Format: "2025-01-15 09:15:00"
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function nearestExpiry(instruments: KiteInstrument[]): string | null {
  const today = new Date().toISOString().slice(0, 10);
  const expiries = [...new Set(instruments.map(i => i.expiry))]
    .filter(e => e >= today)
    .sort();
  return expiries[0] ?? null;
}

function parseInstrumentsCSV(csv: string): KiteInstrument[] {
  const lines = csv.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",");
  const idx = (h: string) => headers.indexOf(h);

  return lines.slice(1).map(line => {
    const parts = line.split(",");
    return {
      instrument_token: +(parts[idx("instrument_token")] ?? 0),
      tradingsymbol: parts[idx("tradingsymbol")] ?? "",
      name: parts[idx("name")] ?? "",
      expiry: parts[idx("expiry")] ?? "",
      strike: +(parts[idx("strike")] ?? 0),
      instrument_type: parts[idx("instrument_type")] ?? "",
      exchange: parts[idx("exchange")] ?? "",
      lot_size: +(parts[idx("lot_size")] ?? 0),
    };
  }).filter(i => i.tradingsymbol);
}

function calcMaxPain(strikes: OptionStrike[]): number {
  // For each possible expiry price, compute total option writer's loss
  let minLoss = Infinity, maxPainStrike = strikes[0]?.strike ?? 0;
  for (const { strike: expPrice } of strikes) {
    let totalLoss = 0;
    for (const { strike, call, put } of strikes) {
      // Call writer loss: max(expPrice - strike, 0) * oi
      totalLoss += Math.max(expPrice - strike, 0) * (call?.oi ?? 0);
      // Put writer loss: max(strike - expPrice, 0) * oi
      totalLoss += Math.max(strike - expPrice, 0) * (put?.oi ?? 0);
    }
    if (totalLoss < minLoss) { minLoss = totalLoss; maxPainStrike = expPrice; }
  }
  return maxPainStrike;
}

function estimateDelta(spot: number, strike: number, type: "CE" | "PE"): number {
  const moneyness = (spot - strike) / spot;
  if (type === "CE") return r2(Math.min(0.99, Math.max(0.01, 0.5 + moneyness * 2)));
  return r2(Math.max(-0.99, Math.min(-0.01, -0.5 + moneyness * 2)));
}

function estimateIV(ltp: number, spot: number, strike: number, type: "CE" | "PE"): number {
  // Very rough IV estimate from price when Kite doesn't return it
  const moneyness = Math.abs(spot - strike) / spot;
  return r2(12 + moneyness * 40 + Math.random() * 3);
}
