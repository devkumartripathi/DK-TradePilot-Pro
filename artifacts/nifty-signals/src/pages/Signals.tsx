import * as React from "react"
import { useGetTradeSignals, getGetTradeSignalsQueryKey } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency } from "@/lib/utils"
import { AlertTriangle, ArrowDown, ArrowUp, CheckCircle, Clock, Crosshair, RefreshCw, TrendingUp, XCircle, Zap } from "lucide-react"

function ConfidenceBar({ score, label }: { score: number; label: string }) {
  const color = score >= 80 ? "bg-success" : score >= 60 ? "bg-warning" : "bg-destructive"
  const textColor = score >= 80 ? "text-success" : score >= 60 ? "text-warning" : "text-destructive"
  const bgColor = score >= 80 ? "bg-success/10 border-success/30" : score >= 60 ? "bg-warning/10 border-warning/30" : "bg-destructive/10 border-destructive/30"
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">Confidence</span>
        <span className={cn("text-sm font-bold font-mono", textColor)}>{score.toFixed(0)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div className={cn("h-full rounded-full transition-all duration-500", color)} style={{ width: `${score}%` }} />
      </div>
      <div className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded border w-fit", bgColor, textColor)}>{label}</div>
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { variant: "success" | "destructive" | "secondary" | "warning"; icon: React.ElementType; label: string }> = {
    ACTIVE: { variant: "success", icon: Zap, label: "ACTIVE" },
    HIT_TARGET1: { variant: "success", icon: CheckCircle, label: "TARGET 1 HIT" },
    HIT_TARGET2: { variant: "success", icon: CheckCircle, label: "TARGET 2 HIT" },
    HIT_TARGET3: { variant: "success", icon: CheckCircle, label: "TARGET 3 HIT" },
    STOPPED_OUT: { variant: "destructive", icon: XCircle, label: "STOPPED OUT" },
    EXPIRED: { variant: "secondary", icon: Clock, label: "EXPIRED" },
  }
  const { variant, icon: Icon, label } = map[status] ?? { variant: "secondary" as const, icon: Clock, label: status }
  return (
    <Badge variant={variant} className="flex items-center gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  )
}

function TradeSignalCard({ signal }: { signal: {
  id: string; type: string; instrument: string; direction: "BUY" | "SELL";
  entry: number; stopLoss: number; target1: number; target2: number; target3: number;
  riskReward: number; confidenceScore: number; confidenceLabel: string; rationale: string;
  smcSetup: string; optionType: string; strikePrice: number | null; expiry: string | null;
  status: string; timestamp: string;
} }) {
  const isBuy = signal.direction === "BUY"

  return (
    <div className={cn(
      "rounded-lg border bg-card p-5 flex flex-col gap-4 transition-all",
      signal.status === "ACTIVE" ? "border-primary/20 shadow-[0_0_15px_rgba(0,0,0,0.3)]" : "border-border opacity-70"
    )}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className={cn(
            "text-base font-black px-3 py-1.5 rounded font-mono border flex items-center gap-1.5",
            isBuy
              ? "bg-success/15 text-success border-success/40 shadow-[0_0_10px_rgba(34,197,94,0.15)]"
              : "bg-destructive/15 text-destructive border-destructive/40 shadow-[0_0_10px_rgba(239,68,68,0.15)]"
          )}>
            {isBuy ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
            {signal.direction}
          </div>
          <div>
            <div className="font-bold text-base">{signal.instrument}</div>
            <div className="text-xs text-muted-foreground font-mono">
              {signal.optionType}{signal.strikePrice ? ` ${signal.strikePrice}` : ""}
              {signal.expiry ? ` · ${signal.expiry}` : ""}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-[10px]">{signal.type}</Badge>
          <StatusBadge status={signal.status} />
        </div>
      </div>

      {/* Levels */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "Entry", value: signal.entry, color: "text-foreground" },
          { label: "Stop Loss", value: signal.stopLoss, color: "text-destructive" },
          { label: "Target 1", value: signal.target1, color: "text-success" },
          { label: "Target 2", value: signal.target2, color: "text-success" },
          { label: "Target 3", value: signal.target3, color: "text-success" },
          { label: "Risk:Reward", value: null, rr: signal.riskReward, color: "text-primary" },
        ].map(({ label, value, rr, color }) => (
          <div key={label} className="flex flex-col gap-0.5 bg-muted/40 rounded-md p-2">
            <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
            <span className={cn("text-sm font-bold font-mono", color)}>
              {rr !== undefined ? `1:${rr.toFixed(1)}` : value?.toFixed(2)}
            </span>
          </div>
        ))}
      </div>

      {/* Confidence + Setup */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <ConfidenceBar score={signal.confidenceScore} label={signal.confidenceLabel} />
        <div className="flex flex-col gap-1">
          <span className="text-xs text-muted-foreground">SMC Setup</span>
          <span className="text-xs font-mono bg-primary/10 text-primary border border-primary/20 px-2 py-1 rounded">{signal.smcSetup}</span>
        </div>
      </div>

      {/* Rationale */}
      <div className="rounded-md bg-muted/30 border border-border px-3 py-2">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Analysis</div>
        <p className="text-xs text-foreground/80 leading-relaxed">{signal.rationale}</p>
      </div>

      <div className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
        <Clock className="w-3 h-3" />
        Generated: {new Date(signal.timestamp).toLocaleTimeString("en-IN", { hour12: false })} IST
      </div>
    </div>
  )
}

export default function Signals() {
  const { data: signals, isLoading, refetch } = useGetTradeSignals({
    query: { refetchInterval: 10000, queryKey: getGetTradeSignalsQueryKey() }
  })

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Crosshair className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">AI Trade Signals</h1>
          {signals && (
            <Badge variant={signals.marketBias === "BULLISH" ? "success" : signals.marketBias === "BEARISH" ? "destructive" : "secondary"}>
              {signals.marketBias === "BULLISH" ? <ArrowUp className="w-3 h-3 mr-1" /> : signals.marketBias === "BEARISH" ? <ArrowDown className="w-3 h-3 mr-1" /> : null}
              {signals.marketBias} BIAS
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          {signals && <span className="text-xs text-muted-foreground font-mono">{signals.sessionTime} · Updated {new Date(signals.generatedAt).toLocaleTimeString("en-IN", { hour12: false })}</span>}
          <button onClick={() => refetch()} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 border border-border rounded px-2 py-1 hover:bg-muted transition-colors">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {signals?.noTradeZone && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-warning/50 bg-warning/10">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-warning text-sm">NO TRADE ZONE ACTIVE</div>
            <p className="text-xs text-warning/80 mt-0.5">{signals.noTradeReason}</p>
            <p className="text-xs text-muted-foreground mt-2">Entering trades during no-trade zones significantly increases risk. Wait for optimal conditions.</p>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-56 animate-pulse rounded-lg border border-border bg-muted" />
          ))}
        </div>
      ) : !signals?.signals?.length ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <TrendingUp className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">No Signals Available</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {signals?.noTradeReason ?? "The AI is scanning for high-probability SMC setups. Signals appear when market structure aligns with ICT concepts."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {signals.signals.map(sig => (
            <TradeSignalCard key={sig.id} signal={sig} />
          ))}
        </div>
      )}
    </div>
  )
}
