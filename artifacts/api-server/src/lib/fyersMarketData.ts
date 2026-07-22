import { fyers } from "./fyersClient";
import { getAccessToken } from "./tokenStore";

export async function getFyersQuote() {
  const token = getAccessToken();

  if (!token) {
    return null;
  }

  fyers.setAccessToken(token);
const quotes = await fyers.getQuotes([
  "NSE:NIFTY50-INDEX",
  "NSE:NIFTYBANK-INDEX",
  "BSE:SENSEX-INDEX",
]);

console.log("FYERS Quote:", JSON.stringify(quotes, null, 2));

return quotes;
}