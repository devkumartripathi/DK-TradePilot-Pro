import type { Instrument } from "./instrumentConfig";

export interface OptionContract {
  instrument: Instrument;

  symbol: string;

  strike: number;

  optionType: "CE" | "PE";

  expiry: string;

  distanceFromATM?: number;
}

export interface ExpiryGroup {
  weekly: OptionContract[];
  monthly: OptionContract[];
  quarterly: OptionContract[];
}

export interface StrikeRangeConfig {
  leftRange: number;
  rightRange: number;
  autoRange?: boolean;
}

export const DEFAULT_STRIKE_RANGE: StrikeRangeConfig = {
  leftRange: 10,
  rightRange: 10,
  autoRange: false,
};