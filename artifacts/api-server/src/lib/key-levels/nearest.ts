import { RawKeyLevel } from "./types";

export function getNearestLevel(
  levels: RawKeyLevel[],
  ltp: number,
  side: "ABOVE" | "BELOW"
): RawKeyLevel | null {
  const filtered = levels.filter(level =>
    side === "ABOVE"
      ? level.price >= ltp
      : level.price <= ltp
  );

  if (filtered.length === 0) {
    return null;
  }

  filtered.sort(
    (a, b) =>
      Math.abs(a.price - ltp) -
      Math.abs(b.price - ltp)
  );

  return filtered[0];
}