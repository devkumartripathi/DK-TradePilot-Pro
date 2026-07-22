import { getFyersQuote } from "./fyersMarketData";

export async function getNiftyLTP() {
  const response = await getFyersQuote();

  if (!response) {
    return null;
  }

  return response.d?.[0]?.v?.lp ?? null;
}