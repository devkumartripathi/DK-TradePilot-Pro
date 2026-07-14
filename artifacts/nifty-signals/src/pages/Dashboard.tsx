import * as React from "react"
import {
  useGetNiftyData, getGetNiftyDataQueryKey,
  useGetOptionsMetrics, getGetOptionsMetricsQueryKey,
  useGetSmcAnalysis, getGetSmcAnalysisQueryKey,
  useGetTradeSignals, getGetTradeSignalsQueryKey,
  useGetVwap, getGetVwapQueryKey,
} from "@workspace/api-client-react"
import { NiftyTicker } from "@/components/NiftyTicker"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency, formatLargeNumber } from "@/lib/utils"
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, BarChart2,
  Crosshair, Layers, Target, TrendingUp, Zap
} from "lucide-react"

function MetricCard({ label, value, sub, variant, icon: Icon }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode;
  variant?: "default" | "success" | "destructive" | "warning"; icon?: React.ElementType
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{label}</span>
        {Icon && <Icon className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
      <div className={cn("text-xl font-bold font-mono",
        variant === "success" && "text-success",
        variant === "destructive" && "text-destructive",
        variant === "warning" && "text-warning",
      )}>{value}</div>
      {sub && <div className="text-xs text-muted-foreground">{sub}</div>}
    </div>
  )
}

type SignalType = "CALL_BUY" | "CALL_SELL" | "PUT_BUY" | "PUT_SELL"
const SIGNAL_BADGE: Record<string, { label: string; cls: string }> = {
  CALL_BUY:  { label: "CALL BUY",  cls: "bg-success/15 text-success border-success/30" },
  PUT_BUY:   { label: "PUT BUY",   cls: "bg-destructive/15 text-destructive border-destructive/30" },
  CALL_SELL: { label: "CALL SELL", cls: "bg-warning/15 text-warning border-warning/30" },
  PUT_SELL:  { label: "PUT SELL",  cls: "bg-primary/15 text-primary border-primary/30" },
}

function SignalCard({ signal }: { signal: {
  id: string; direction: "BUY" | "SELL"; instrument: string; optionType: string;
  optionSignalType?: string;
  strikePrice: number | null; optionLtp?: number | null;
  entry: number; stopLoss: number; target1: number;
  target2: number; target3: number; riskReward: number; confidenceScore: number;
  confidenceLabel: string; smcSetup: string; status: string;
} }) {
  const sigType = (signal.optionSignalType ?? (signal.direction === "BUY" ? "CALL_BUY" : "PUT_BUY")) as SignalType
  const badge = SIGNAL_BADGE[sigType] ?? SIGNAL_BADGE.CALL_BUY
  return (
    <div className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={cn("text-xs font-bold px-2 py-0.5 rounded border font-mono", badge.cls)}>{badge.label}</span>
          <span className="text-sm font-semibold">{signal.instrument}</span>
          <span className="text-xs text-muted-foreground font-mono">{signal.strikePrice ?? ""} {signal.optionType}</span>
        </div>
        <div className="text-xs font-bold px-2 py-0.5 rounded border bg-success/10 border-success/30 text-success">
          {signal.confidenceScore.toFixed(0)}% {signal.confidenceLabel}
        </div>
      </div>
      {signal.optionLtp != null && (
        <div className="text-xs text-muted-foreground font-mono">Option LTP: <span className="text-foreground font-bold">₹{signal.optionLtp.toFixed(2)}</span></div>
      )}
      <div className="grid grid-cols-3 gap-2 text-xs font-mono">
        <div className="flex flex-col"><span className="text-muted-foreground">Entry</span><span className="font-semibold">{signal.entry.toFixed(2)}</span></div>
        <div className="flex flex-col"><span className="text-destructive/80">Stop Loss</span><span className="font-semibold text-destructive">{signal.stopLoss.toFixed(2)}</span></div>
        <div className="flex flex-col"><span className="text-muted-foreground">R:R</span><span className="font-semibold text-success">1:{signal.riskReward.toFixed(1)}</span></div>
        <div className="flex flex-col"><span className="text-success/80">T1</span><span className="font-semibold text-success">{signal.target1.toFixed(2)}</span></div>
        <div className="flex flex-col"><span className="text-success/80">T2</span><span className="font-semibold text-success">{signal.target2.toFixed(2)}</span></div>
        <div className="flex flex-col"><span className="text-success/80">T3</span><span className="font-semibold text-success">{signal.target3.toFixed(2)}</span></div>
      </div>
      <div className="text-[10px] text-muted-foreground bg-muted/50 rounded px-2 py-1 font-mono">{signal.smcSetup}</div>
    </div>
  )
}

export default function Dashboard() {
  const { data: metrics } = useGetOptionsMetrics({ query: { refetchInterval: 10000, queryKey: getGetOptionsMetricsQueryKey() } })
  const { data: smc } = useGetSmcAnalysis({ query: { refetchInterval: 15000, queryKey: getGetSmcAnalysisQueryKey() } })
  const { data: signals } = useGetTradeSignals({ query: { refetchInterval: 10000, queryKey: getGetTradeSignalsQueryKey() } })
  const { data: vwap } = useGetVwap({ query: { refetchInterval: 5000, queryKey: getGetVwapQueryKey() } })

  const activeSignals = signals?.signals?.filter(s => s.status === "ACTIVE") ?? []

  return (
    <div className="flex flex-col gap-6">
      <NiftyTicker />

      {signals?.noTradeZone && (
        <div className="flex items-center gap-3 p-4 rounded-lg border border-warning/40 bg-warning/10 text-warning">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <div>
            <div className="font-bold text-sm">NO TRADE ZONE ACTIVE</div>
            <div className="text-xs text-warning/80 mt-0.5">{signals.noTradeReason}</div>
          </div>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetricCard
          label="India VIX"
          value={metrics ? metrics.indiaVix.toFixed(2) : "—"}
          sub={metrics ? <span className={metrics.vixChange >= 0 ? "text-destructive" : "text-success"}>{metrics.vixChange >= 0 ? "+" : ""}{metrics.vixChange.toFixed(2)} {metrics.vixSignal.replace("_", " ")}</span> : undefined}
          icon={Activity}
          variant={metrics && metrics.indiaVix > 18 ? "destructive" : metrics && metrics.indiaVix < 14 ? "success" : "warning"}
        />
        <MetricCard
          label="PCR"
          value={metrics ? metrics.pcr.toFixed(2) : "—"}
          sub={metrics ? <Badge variant={metrics.pcrSignal === "BULLISH" ? "success" : metrics.pcrSignal === "BEARISH" ? "destructive" : "secondary"} className="text-[10px] px-1.5 py-0">{metrics.pcrSignal}</Badge> : undefined}
          icon={BarChart2}
          variant={metrics && metrics.pcrSignal === "BULLISH" ? "success" : metrics && metrics.pcrSignal === "BEARISH" ? "destructive" : undefined}
        />
        <MetricCard
          label="Max Pain"
          value={metrics ? formatCurrency(metrics.maxPain) : "—"}
          sub="OI-weighted strike"
          icon={Target}
        />
        <MetricCard
          label="VWAP"
          value={vwap ? formatCurrency(vwap.vwap) : "—"}
          sub={vwap ? <span className={vwap.priceVsVwap === "ABOVE" ? "text-success" : vwap.priceVsVwap === "BELOW" ? "text-destructive" : ""}>{vwap.priceVsVwap} VWAP · {vwap.vwapTrend}</span> : undefined}
          icon={TrendingUp}
          variant={vwap && vwap.priceVsVwap === "ABOVE" ? "success" : vwap && vwap.priceVsVwap === "BELOW" ? "destructive" : undefined}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SMC Summary */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm uppercase tracking-wider">SMC Analysis</h2>
            {smc && <Badge variant={smc.bias === "BULLISH" ? "success" : smc.bias === "BEARISH" ? "destructive" : "secondary"}>{smc.bias}</Badge>}
          </div>

          {!smc ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 animate-pulse bg-muted rounded-lg border border-border" />)}</div>
          ) : (
            <div className="flex flex-col gap-3">
              {/* Market Structure */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Market Structure</span>
                  <Badge variant={smc.marketStructure.trend === "UPTREND" ? "success" : smc.marketStructure.trend === "DOWNTREND" ? "destructive" : "secondary"}>
                    {smc.marketStructure.trend}
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-mono mb-3">
                  <div><span className="text-muted-foreground">Phase: </span><span className="text-foreground">{smc.marketStructure.phase}</span></div>
                  <div><span className="text-muted-foreground">Swing H: </span><span className="text-success">{smc.marketStructure.currentSwingHigh.toFixed(2)}</span></div>
                  <div className="flex gap-2">
                    {smc.marketStructure.higherHigh && <span className="text-success">HH</span>}
                    {smc.marketStructure.higherLow && <span className="text-success">HL</span>}
                    {smc.marketStructure.lowerHigh && <span className="text-destructive">LH</span>}
                    {smc.marketStructure.lowerLow && <span className="text-destructive">LL</span>}
                  </div>
                  <div><span className="text-muted-foreground">Swing L: </span><span className="text-destructive">{smc.marketStructure.currentSwingLow.toFixed(2)}</span></div>
                </div>
              </div>

              {/* Order Blocks */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Active Order Blocks</div>
                <div className="flex flex-col gap-2">
                  {smc.orderBlocks.filter(ob => !ob.mitigated).slice(0, 3).map(ob => (
                    <div key={ob.id} className="flex items-center justify-between text-xs font-mono">
                      <Badge variant={ob.type === "BULLISH" ? "success" : "destructive"} className="text-[10px] px-1.5">{ob.type}</Badge>
                      <span className="text-muted-foreground">{ob.bottom.toFixed(1)} – {ob.top.toFixed(1)}</span>
                      <span className="text-muted-foreground">{ob.timeframe}</span>
                      <Badge variant="secondary" className="text-[10px] px-1.5">{ob.strength}</Badge>
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Levels */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Key Levels</div>
                <div className="flex flex-col gap-1.5">
                  {smc.keyLevels.slice(0, 4).map((kl, i) => (
                    <div key={i} className="flex items-center justify-between text-xs font-mono">
                      <span className={cn("font-semibold", kl.type === "SUPPORT" ? "text-success" : kl.type === "RESISTANCE" ? "text-destructive" : "text-primary")}>{kl.type}</span>
                      <span>{kl.level.toFixed(2)}</span>
                      <span className="text-muted-foreground">{kl.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Active Signals */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Crosshair className="w-4 h-4 text-primary" />
            <h2 className="font-semibold text-sm uppercase tracking-wider">Active Trade Signals</h2>
            {signals && <Badge variant={signals.marketBias === "BULLISH" ? "success" : signals.marketBias === "BEARISH" ? "destructive" : "secondary"}>{signals.marketBias}</Badge>}
          </div>

          {!signals ? (
            <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-32 animate-pulse bg-muted rounded-lg border border-border" />)}</div>
          ) : activeSignals.length === 0 ? (
            <div className="rounded-lg border border-border bg-card p-8 text-center">
              <Zap className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <div className="text-sm text-muted-foreground">No active signals</div>
              <div className="text-xs text-muted-foreground mt-1">{signals.noTradeReason ?? "Waiting for high-probability setup..."}</div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {activeSignals.map(sig => <SignalCard key={sig.id} signal={sig} />)}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
