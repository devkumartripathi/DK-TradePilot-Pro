import { fyers } from "../lib/fyersClient";
import axios from "axios";
import { getAccessToken } from "../lib/tokenStore";

export async function getHistoryData( 

  accessToken: string,
  symbol: string,
  resolution: string,
  rangeFrom: string,
  rangeTo: string
) {
  fyers.setAccessToken(accessToken);
console.log("History Symbol:", symbol);

  const history = await fyers.getHistory({ 
    symbol,
    resolution,
    date_format: "1",
    range_from: rangeFrom,
    range_to: rangeTo,
    cont_flag: "1",
  }); 
  console.log("========== RAW HISTORY ==========");
console.dir(history, { depth: null });
console.log("================================");

  console.dir(history, { depth: null });
  return history;
}

export async function getOptionChain(symbol: string) {
  const token = getAccessToken();

  if (!token) {
    throw new Error("FYERS access token not available");
  }

  const response = await axios.get(
    "https://api-t1.fyers.in/data/options-chain-v3",
    {
      params: {
        symbol,
        strikecount: 100,
        greeks: 1,
      },
      headers: {
        Authorization: `${process.env.FYERS_APP_ID}:${token}`,
      },
    }
  );

console.log(JSON.stringify(response.data, null, 2));
console.log(Object.keys(response));
console.dir(response.data, { depth: null });
console.log(Object.keys(response.data));
  return response.data;
}