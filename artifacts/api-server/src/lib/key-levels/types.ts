export type LevelType =
  | "SWING_HIGH"
  | "SWING_LOW"
  | "BULLISH_OB"
  | "BEARISH_OB"
  | "BULLISH_FVG"
  | "BEARISH_FVG";

export type LevelSide = "ABOVE" | "BELOW";

export type LevelStrength =
  | "STRONG"
  | "MODERATE"
  | "WEAK";

export interface RawKeyLevel {
  type: LevelType;
  price: number;
  strength?: LevelStrength;
}

export interface DisplayKeyLevel extends RawKeyLevel {
  side: LevelSide;
  distance: number;
  label: string;
}