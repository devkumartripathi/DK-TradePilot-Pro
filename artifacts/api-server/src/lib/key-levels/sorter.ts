import { RawKeyLevel } from "./types";

export function sortLevelsByDistance(
  levels: RawKeyLevel[],
  ltp: number
): RawKeyLevel[] {
  return [...levels].sort(
    (a, b) =>
      Math.abs(a.price - ltp) -
      Math.abs(b.price - ltp)
  );
}