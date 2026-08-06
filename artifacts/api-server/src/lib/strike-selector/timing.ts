export interface TimingPlan {
  marketPhase:
    | "PRE_OPEN"
    | "OPEN_DRIVE"
    | "TREND"
    | "LUNCH"
    | "AFTERNOON"
    | "CLOSING";

  entryAllowed: boolean;

  thetaFavorable: boolean;

  liquidityRisk:
    | "LOW"
    | "MEDIUM"
    | "HIGH";

  entryWindow: {
    from: string;
    to: string;
    lastSafeEntry: string;
  };

  exitPlan: {
    targetExit: string;
    timeExit: string;
  };

  reason: string;
}

export function buildTimingPlan(now = new Date()): TimingPlan {

  const h = now.getHours();
  const m = now.getMinutes();

  // PRE OPEN
  if (h === 9 && m < 15) {
    return {
      marketPhase: "PRE_OPEN",
      entryAllowed: false,
      thetaFavorable: false,
      liquidityRisk: "HIGH",

      entryWindow: {
        from: "09:15",
        to: "09:25",
        lastSafeEntry: "09:30",
      },

      exitPlan: {
        targetExit: "Next Major Resistance / Support",
        timeExit: "15:38",
      },

      reason:
        "Pre-open session. Wait for price discovery before taking any trade.",
    };
  }

  // OPEN DRIVE
  if (h === 9 && m <= 45) {
    return {
      marketPhase: "OPEN_DRIVE",
      entryAllowed: true,
      thetaFavorable: false,
      liquidityRisk: "MEDIUM",

      entryWindow: {
        from: "09:16",
        to: "09:30",
        lastSafeEntry: "09:35",
      },

      exitPlan: {
        targetExit: "Next Major Resistance / Support",
        timeExit: "15:38",
      },

      reason:
        "Opening momentum. Trade only after confirmation candle.",
    };
  }

  // LUNCH SESSION
  if (h === 12 || (h === 13 && m < 30)) {
    return {
      marketPhase: "LUNCH",
      entryAllowed: false,
      thetaFavorable: true,
      liquidityRisk: "HIGH",

      entryWindow: {
        from: "13:30",
        to: "14:00",
        lastSafeEntry: "14:10",
      },

      exitPlan: {
        targetExit: "Next Major Resistance / Support",
        timeExit: "15:38",
      },

      reason:
        "Avoid fresh entries. Low liquidity may create false spikes. Existing option-selling trades may benefit from theta decay.",
    };
  }

  // AFTERNOON SESSION
  if (h === 14) {
    return {
      marketPhase: "AFTERNOON",
      entryAllowed: true,
      thetaFavorable: true,
      liquidityRisk: "LOW",

      entryWindow: {
        from: "14:00",
        to: "14:45",
        lastSafeEntry: "15:00",
      },

      exitPlan: {
        targetExit: "Next Major Resistance / Support",
        timeExit: "15:38",
      },

      reason:
        "Good probability of directional continuation after lunch consolidation.",
    };
  }

  // CLOSING SESSION
  if (h >= 15) {
    return {
      marketPhase: "CLOSING",
      entryAllowed: false,
      thetaFavorable: true,
      liquidityRisk: "HIGH",

      entryWindow: {
        from: "--",
        to: "--",
        lastSafeEntry: "--",
      },

      exitPlan: {
        targetExit: "EXIT NOW",
        timeExit: "15:38",
      },

      reason:
        "Avoid new entries. Exit remaining intraday positions before market close.",
    };
  }

  // TREND SESSION
  return {
    marketPhase: "TREND",
    entryAllowed: true,
    thetaFavorable: false,
    liquidityRisk: "LOW",

    entryWindow: {
      from: "NOW",
      to: "NEXT 10 MIN",
      lastSafeEntry: "15 MIN",
    },

    exitPlan: {
      targetExit: "Next Major Resistance / Support",
      timeExit: "15:38",
    },

    reason:
      "Normal trending session. Follow AI signal confirmation before entry.",
  };
}