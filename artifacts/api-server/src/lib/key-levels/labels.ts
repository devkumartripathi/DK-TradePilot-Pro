import { LevelType } from "./types";

export function getLevelLabel(type: LevelType): string {
  switch (type) {
    case "SWING_HIGH":
      return "Swing High";

    case "SWING_LOW":
      return "Swing Low";

    case "BULLISH_OB":
      return "Bullish Order Block";

    case "BEARISH_OB":
      return "Bearish Order Block";

    case "BULLISH_FVG":
      return "Bullish Fair Value Gap";

    case "BEARISH_FVG":
      return "Bearish Fair Value Gap";

    default:
      return "Unknown";
  }
}