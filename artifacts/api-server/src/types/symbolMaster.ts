import { parseSymbolMaster } from "./symbolMasterParser";

const FYERS_NSE_FO_URL =
  "https://public.fyers.in/sym_details/NSE_FO.csv";

export async function downloadSymbolMaster(): Promise<string> {
  const response = await fetch(FYERS_NSE_FO_URL);

  if (!response.ok) {
    throw new Error(
      `Failed to download Symbol Master: ${response.status}`
    );
  }

  return await response.text();
}

export async function loadSymbolMaster(): Promise<string> {
  const csv = await downloadSymbolMaster();

  console.log(`Symbol Master downloaded (${csv.length} bytes)`);

  const records = parseSymbolMaster(csv);

  console.log(`Parsed Records: ${records.length}`);

  const counts = {
    NIFTY: records.filter(r => r.underlying === "NIFTY").length,
    SENSEX: records.filter(r => r.underlying === "SENSEX").length,
    BANKNIFTY: records.filter(r => r.underlying === "BANKNIFTY").length,
    FINNIFTY: records.filter(r => r.underlying === "FINNIFTY").length,
    MIDCPNIFTY: records.filter(r => r.underlying === "MIDCPNIFTY").length,
  };

  console.table(counts);

  return csv;
}