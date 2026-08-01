export function getDistanceFromLtp(
  levelPrice: number,
  ltp: number
): number {
  return Number((levelPrice - ltp).toFixed(2));
}