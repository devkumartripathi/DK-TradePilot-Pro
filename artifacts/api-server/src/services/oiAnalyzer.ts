export interface OIAnalysis {
  callWriting: number[];
  putWriting: number[];
  longBuildUp: number[];
  shortBuildUp: number[];
  shortCovering: number[];
  longUnwinding: number[];
}

export function analyzeOI(optionChain: any): OIAnalysis {
  const rows = optionChain.data.optionsChain ?? [];

  const result: OIAnalysis = {
    callWriting: [],
    putWriting: [],
    longBuildUp: [],
    shortBuildUp: [],
    shortCovering: [],
    longUnwinding: [],
  };

  for (const row of rows) {
    if (!row.option_type) continue;

    const oiChange = Number(row.oich ?? 0);
    const priceChange = Number(row.ltpch ?? 0);
    const strike = Number(row.strike_price);

    // Long Build-up
    if (oiChange > 0 && priceChange > 0) {
      result.longBuildUp.push(strike);
    }

    // Short Build-up
    if (oiChange > 0 && priceChange < 0) {
      result.shortBuildUp.push(strike);

      if (row.option_type === "CE") {
        result.callWriting.push(strike);
      }

      if (row.option_type === "PE") {
        result.putWriting.push(strike);
      }
    }

    // Short Covering
    if (oiChange < 0 && priceChange > 0) {
      result.shortCovering.push(strike);
    }

    // Long Unwinding
    if (oiChange < 0 && priceChange < 0) {
      result.longUnwinding.push(strike);
    }
  }

  return result;
}