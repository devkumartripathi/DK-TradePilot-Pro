import type { SymbolMasterRecord } from "../types/symbolMaster";

export function parseSymbolMaster(
  csv: string,
): SymbolMasterRecord[] {
  const rows = csv.split(/\r?\n/).filter(Boolean);

  const dataRows = rows.slice(1);

  return dataRows
    .map((row) => {
      const columns = row.split(",");

      return {
        token: columns[0] ?? "",
        description: columns[1] ?? "",
        exchange: columns[10] ?? "",
        symbol: columns[9] ?? "",
        underlying: columns[13] ?? "",
        expiry: columns[7] ?? "",
        raw: columns,
      };
    })
    .filter((record) => record.token && record.symbol);
}
