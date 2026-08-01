import type {
  OptionChainData,
  OptionStrike,
} from "./types.js";

export function mapFyersOptionChain(data: any): OptionChainData {
  const strikes: OptionStrike[] = (data.strikes ?? []).map((row: any) => ({
    strike: row.strikePrice,

    call: {
      tradingsymbol: row.call?.symbol ?? "",
      ltp: row.call?.ltp ?? 0,
      iv: row.call?.iv ?? 0,
      delta: row.call?.delta ?? 0,
      gamma: row.call?.gamma ?? 0,
      theta: row.call?.theta ?? 0,
      vega: row.call?.vega ?? 0,
      oi: row.call?.oi ?? 0,
      oiChange: row.call?.oiChange ?? 0,
      volume: row.call?.volume ?? 0,
      bidPrice: row.call?.bid ?? 0,
      askPrice: row.call?.ask ?? 0,
    },

    put: {
      tradingsymbol: row.put?.symbol ?? "",
      ltp: row.put?.ltp ?? 0,
      iv: row.put?.iv ?? 0,
      delta: row.put?.delta ?? 0,
      gamma: row.put?.gamma ?? 0,
      theta: row.put?.theta ?? 0,
      vega: row.put?.vega ?? 0,
      oi: row.put?.oi ?? 0,
      oiChange: row.put?.oiChange ?? 0,
      volume: row.put?.volume ?? 0,
      bidPrice: row.put?.bid ?? 0,
      askPrice: row.put?.ask ?? 0,
    },
  }));
  return {
    expiry: data.expiry ?? "",
    spotPrice: data.spotPrice ?? 0,
    atmStrike: Math.round((data.spotPrice ?? 0) / 50) * 50,
    atmIV: strikes.find(
      s => s.strike === Math.round((data.spotPrice ?? 0) / 50) * 50
    )?.call.iv ?? 0,
    strikes,
    totalCallOI: data.totalCallOI ?? 0,
    totalPutOI: data.totalPutOI ?? 0,
    pcr:
      (data.totalCallOI ?? 0) > 0
        ? (data.totalPutOI ?? 0) / data.totalCallOI
        : 0,
    maxPain: Math.round((data.spotPrice ?? 0) / 50) * 50,
  };
}
