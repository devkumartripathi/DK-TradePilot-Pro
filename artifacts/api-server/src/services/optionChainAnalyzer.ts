export interface OptionChainAnalysis {
  spot: number;
  atmStrike: number;
  totalCallOI: number;
  totalPutOI: number;
  pcr: number;
  highestCallOI: {
    strike: number;
    oi: number;
  };
  highestPutOI: {
    strike: number;
    oi: number;
  };
}

export function analyzeOptionChain(optionChain: any): OptionChainAnalysis {
  const rows = optionChain.data.optionsChain;

  const spotRow = rows.find(
    (r: any) => r.option_type === "" || r.strike_price === -1
  );

  const spot = spotRow?.ltp ?? 0;

  let totalCallOI = 0;
  let totalPutOI = 0;

  let highestCallOI = {
    strike: 0,
    oi: 0,
  };

  let highestPutOI = {
    strike: 0,
    oi: 0,
  };

  let atmStrike = 0;
  let minDistance = Number.MAX_SAFE_INTEGER;

  for (const row of rows) {
    if (!row.strike_price || row.strike_price < 0) continue;

    const distance = Math.abs(row.strike_price - spot);

    if (distance < minDistance) {
      minDistance = distance;
      atmStrike = row.strike_price;
    }

    if (row.option_type === "CE") {
      totalCallOI += row.oi ?? 0;

      if ((row.oi ?? 0) > highestCallOI.oi) {
        highestCallOI = {
          strike: row.strike_price,
          oi: row.oi,
        };
      }
    }

    if (row.option_type === "PE") {
      totalPutOI += row.oi ?? 0;

      if ((row.oi ?? 0) > highestPutOI.oi) {
        highestPutOI = {
          strike: row.strike_price,
          oi: row.oi,
        };
      }
    }
  }

  return {
    spot,
    atmStrike,
    totalCallOI,
    totalPutOI,
    pcr:
      totalCallOI === 0
        ? 0
        : Number((totalPutOI / totalCallOI).toFixed(2)),
    highestCallOI,
    highestPutOI,
  };
} 
