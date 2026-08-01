export interface OptionChainAnalysis {
  spot: number;
  atmStrike: number;
  totalCallOI: number;
  totalPutOI: number;
  pcr: number;
  maxPain: number;
  callWall: number; 
  putWall: number; 
  support: number;
resistance: number;
equilibrium: number;


  highestCallOI: {
    strike: number;
    oi: number;
  };

  highestPutOI: {
    strike: number;
    oi: number;
  };
}

function calculateMaxPain(rows: any[]): number {
  type StrikeData = {
    ceOi: number;
    peOi: number;
  };

  const strikeMap = new Map<number, StrikeData>();

  for (const row of rows) {
    if (!row.strike_price || row.strike_price < 0) continue;

    if (!strikeMap.has(row.strike_price)) {
      strikeMap.set(row.strike_price, {
        ceOi: 0,
        peOi: 0,
      });
    }

    const strike = strikeMap.get(row.strike_price)!;

    if (row.option_type === "CE") {
      strike.ceOi = row.oi ?? 0;
    }

    if (row.option_type === "PE") {
      strike.peOi = row.oi ?? 0;
    }
  }
const strikes = [...strikeMap.keys()].sort((a, b) => a - b);

console.table(
  strikes.map((strike) => ({
    strike,
    ceOi: strikeMap.get(strike)?.ceOi ?? 0,
    peOi: strikeMap.get(strike)?.peOi ?? 0,
  }))
);

let bestStrike = 0;
let minimumPain = Number.MAX_SAFE_INTEGER;

for (const expiryStrike of strikes) {
  let totalPain = 0;

  for (const optionStrike of strikes) {
    const option = strikeMap.get(optionStrike)!;

    if (optionStrike < expiryStrike) {
      totalPain += (expiryStrike - optionStrike) * option.ceOi;
    }

    if (optionStrike > expiryStrike) {
      totalPain += (optionStrike - expiryStrike) * option.peOi;
    }
  }

  if (totalPain < minimumPain) {
    minimumPain = totalPain;
    bestStrike = expiryStrike;
  }
}

console.log("Best Strike:", bestStrike);
console.log("Minimum Pain:", Math.round(minimumPain));

return bestStrike;
}

export function analyzeOptionChain(
  optionChain: any
): OptionChainAnalysis {
  const rows = optionChain.data.optionsChain;

console.log("CALL OI =", optionChain.data.callOi);
console.log("PUT OI  =", optionChain.data.putOi);
console.log("Expiry Data =", optionChain.data.expiryData);

console.log(rows[0]);

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
   if (row.option_type === "PE" && row.strike_price === 26700) {
    if ((row.oi ?? 0) > 1000000) {
  console.log(
    "BIG PE",
    row.strike_price,
    row.oi
  );
}
  console.log("PE SAMPLE =", row);
}

    if (!row.strike_price || row.strike_price < 0) continue;

    const distance = Math.abs(row.strike_price - spot);

    if (distance < minDistance) {
      minDistance = distance;
      atmStrike = row.strike_price;
    }

    if (row.option_type === "CE") {
      totalCallOI += row.oi ?? 0;
      if ((row.oi ?? 0) > 1000000) {
  console.log(
    "BIG CE",
    row.strike_price,
    row.oi
  );
}
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

console.log("Rows:", rows.length);

console.log(
  "CE Count:",
  rows.filter((r: any) => r.option_type === "CE").length
);

console.log(
  "PE Count:",
  rows.filter((r: any) => r.option_type === "PE").length
);

console.log("Total Call OI:", totalCallOI);

console.log("Total Put OI:", totalPutOI);

 const liveCallOI = optionChain.data.callOi;
const livePutOI = optionChain.data.putOi;

  const maxPain = calculateMaxPain(rows);


  return {
    spot,
    atmStrike,
   totalCallOI: liveCallOI,
totalPutOI: livePutOI,
pcr:
  liveCallOI === 0
    ? 0
    : Number((livePutOI / liveCallOI).toFixed(2)),

    maxPain,
    callWall: highestCallOI.strike, 
    putWall: highestPutOI.strike, 
    highestCallOI,
    highestPutOI,
    support: highestPutOI.strike,
    resistance: highestCallOI.strike,
    equilibrium: maxPain,
  };
}