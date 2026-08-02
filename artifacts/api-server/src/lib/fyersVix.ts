import { fyers } from "./fyersClient";
import { getAccessToken } from "./tokenStore";

export async function getFyersVix() {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  fyers.setAccessToken(token);

  const quotes = await fyers.getQuotes([
    "NSE:INDIAVIX-INDEX",
  ]);

  return quotes?.d?.[0]?.v ?? null;
}