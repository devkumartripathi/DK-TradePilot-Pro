type AiTimingPanelProps = {
  timing: {
    marketType: string;
    confidence: number;

    entryWindow: {
      from: string;
      to: string;
      lastSafeEntry: string;
    };

    exitPlan: {
      targetExit: string;
      timeExit: string;
    };

    entryAllowed?: boolean;
    thetaFavorable?: boolean;
    liquidityRisk?: string;
    reason?: string;
  };
};

export function AiTimingPanel({
  timing,
}: AiTimingPanelProps) {
 return (
  <div className="mt-4 grid grid-cols-2 gap-3">

    <div className="rounded border border-border p-3">
      <div className="text-[10px] text-muted-foreground">
        Entry Window
      </div>

      <div className="font-bold">
        {timing.entryWindow.from} → {timing.entryWindow.to}
      </div>

      <div className="text-xs text-muted-foreground">
        Last Safe : {timing.entryWindow.lastSafeEntry}
      </div>
    </div>

    <div className="rounded border border-border p-3">
      <div className="text-[10px] text-muted-foreground">
        Exit Plan
      </div>

      <div className="text-success font-bold">
        Target : {timing.exitPlan.targetExit}
      </div>

      <div className="text-destructive">
        Exit : {timing.exitPlan.timeExit}
      </div>
    </div>

  </div>
);
}