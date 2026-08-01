import { DisplayKeyLevel, RawKeyLevel } from "./types";
import { getDistanceFromLtp } from "./distance";
import { getLevelLabel } from "./labels";
import { sortLevelsByDistance } from "./sorter";

export function buildPresentation(
  levels: RawKeyLevel[],
  ltp: number
): DisplayKeyLevel[] {
  return sortLevelsByDistance(levels, ltp).map(level => ({
    ...level,
    side: level.price >= ltp ? "ABOVE" : "BELOW",
    distance: getDistanceFromLtp(level.price, ltp),
    label: getLevelLabel(level.type),
  }));
}