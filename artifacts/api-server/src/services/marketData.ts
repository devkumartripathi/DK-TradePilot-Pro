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
  return await fyers.getHistory({
    symbol,
    resolution,
    date_format: "1",
    range_from: rangeFrom,
    range_to: rangeTo,
    cont_flag: "1",
  });
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
        strikecount: 10,
        greeks: 1,
      },
      headers: {
        Authorization: `${process.env.FYERS_APP_ID}:${token}`,
      },
    }
  );

  return response.data;
}