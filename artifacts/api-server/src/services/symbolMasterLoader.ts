
import { parseSymbolMaster } from "./symbolMasterParser";

const FYERS_NSE_FO_URL =
  "https://public.fyers.in/sym_details/NSE_FO.csv";

const FYERS_BSE_FO_URL =
  "https://public.fyers.in/sym_details/BSE_FO.csv";

export async function downloadSymbolMaster(): Promise<string> {
  const response = await fetch(FYERS_NSE_FO_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to download Symbol Master: ${response.status}`,
    );
  }

  return await response.text();
}

export async function downloadBseSymbolMaster(): Promise<string> {
  const response = await fetch(FYERS_BSE_FO_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to download BSE Symbol Master: ${response.status}`,
    );
  }

  return await response.text();
}

export async function loadSymbolMaster(): Promise<string> {
  const csv = await downloadSymbolMaster();
  const bseCsv = await downloadBseSymbolMaster();
console.log(`BSE Symbol Master downloaded (${bseCsv.length} bytes)`);
  console.log(`Symbol Master downloaded (${csv.length} bytes)`);

  const records = parseSymbolMaster(csv);
const bseRecords = parseSymbolMaster(bseCsv);
  console.log(`Parsed Records: ${records.length}`);
console.log(`BSE Parsed Records: ${bseRecords.length}`);
console.table(
  bseRecords.filter(
    r =>
      r.description.toUpperCase().includes("SENSEX") ||
      r.symbol.toUpperCase().includes("SENSEX") ||
      r.underlying.toUpperCase().includes("SENSEX")
  ).slice(0, 20)
);
  const counts = {
  NIFTY: records.filter(r => r.underlying === "NIFTY").length,
  SENSEX: bseRecords.filter(r => r.underlying === "SENSEX").length,
  BANKNIFTY: records.filter(r => r.underlying === "BANKNIFTY").length,
  FINNIFTY: records.filter(r => r.underlying === "FINNIFTY").length,
  MIDCPNIFTY: records.filter(r => r.underlying === "MIDCPNIFTY").length,
};

console.table(counts);

const sensexLike = bseRecords.filter(
  (r) =>
    r.description.toUpperCase().includes("SENSEX") ||
    r.symbol.toUpperCase().includes("SENSEX") ||
    r.underlying.toUpperCase().includes("SENSEX"),
);

console.log(`SENSEX-like Records: ${sensexLike.length}`);

  if (sensexLike.length > 0) {
    console.log("First 10 SENSEX-like Records:");
    console.table(sensexLike.slice(0, 10));
  }

  return csv;
}