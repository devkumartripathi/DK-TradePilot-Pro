import * as React from "react"
import { useGetOptionChain, useGetOptionsMetrics, getGetOptionChainQueryKey, getGetOptionsMetricsQueryKey } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatLargeNumber } from "@/lib/utils"
import { Activity, BarChart2, Target, TrendingUp } from "lucide-react"

export default function Options() {
  const { data: chain } = useGetOptionChain(undefined, {
    query: { refetchInterval: 15000, queryKey: getGetOptionChainQueryKey() }
  })
  const { data: metrics, isLoading: metricsLoading } = useGetOptionsMetrics({
    query: { refetchInterval: 10000, queryKey: getGetOptionsMetricsQueryKey() }
  })
  const [selectedExpiry, setSelectedExpiry] = React.useState<string | null>(null)

  const expiry = selectedExpiry ?? metrics?.expiries?.[0] ?? ""

  const atm = chain ? Math.round(chain.spotPrice / 50) * 50 : 0
  const displayStrikes = chain?.strikes.filter(s => {
    const diff = Math.abs(s.strikePrice - atm)
    return diff <= 500
  }) ?? []

  const maxCallOI = Math.max(...displayStrikes.map(s => s.call.oi), 1)
  const maxPutOI = Math.max(...displayStrikes.map(s => s.put.oi), 1)

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <BarChart2 className="w-5 h-5 text-primary" />
        <h1 className="text-xl font-bold tracking-tight">Option Chain Analysis</h1>
      </div>

      {/* Metrics Strip */}
      {metricsLoading ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1,2,3,4].map(i => <div key={i} className="h-20 animate-pulse rounded-lg border border-border bg-muted" />)}
        </div>
      ) : metrics && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Activity className="w-3 h-3" /> PCR</div>
            <div className={cn("text-2xl font-bold font-mono", metrics.pcrSignal === "BULLISH" ? "text-success" : metrics.pcrSignal === "BEARISH" ? "text-destructive" : "text-warning")}>{metrics.pcr.toFixed(2)}</div>
            <Badge variant={metrics.pcrSignal === "BULLISH" ? "success" : metrics.pcrSignal === "BEARISH" ? "destructive" : "secondary"} className="mt-1 text-[10px]">{metrics.pcrSignal}</Badge>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><Target className="w-3 h-3" /> Max Pain</div>
            <div className="text-2xl font-bold font-mono">{metrics.maxPain.toLocaleString("en-IN")}</div>
            <div className="text-xs text-muted-foreground mt-1">OI-weighted</div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> India VIX</div>
            <div className={cn("text-2xl font-bold font-mono", metrics.indiaVix > 18 ? "text-destructive" : metrics.indiaVix < 14 ? "text-success" : "text-warning")}>{metrics.indiaVix.toFixed(2)}</div>
            <div className={cn("text-xs mt-1", metrics.vixChange >= 0 ? "text-destructive" : "text-success")}>
              {metrics.vixChange >= 0 ? "+" : ""}{metrics.vixChange.toFixed(2)} · {metrics.vixSignal.replace("_", " ")}
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-2">OI Analysis</div>
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-destructive font-mono">Calls</span>
                <span className="font-mono font-semibold text-destructive">{formatLargeNumber(metrics.totalCallOI)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-destructive rounded-full" style={{ width: `${(metrics.totalCallOI / (metrics.totalCallOI + metrics.totalPutOI)) * 100}%` }} />
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-success font-mono">Puts</span>
                <span className="font-mono font-semibold text-success">{formatLargeNumber(metrics.totalPutOI)}</span>
              </div>
              <div className="h-1.5 bg-muted rounded-full overflow-hidden flex">
                <div className="h-full bg-success rounded-full" style={{ width: `${(metrics.totalPutOI / (metrics.totalCallOI + metrics.totalPutOI)) * 100}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground mt-1">{metrics.putCallBuildupSignal}</div>
            </div>
          </div>
        </div>
      )}

      {/* Expiry selector */}
      {metrics?.expiries && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs text-muted-foreground uppercase tracking-wider">Expiry:</span>
          {metrics.expiries.map(exp => (
            <button
              key={exp}
              onClick={() => setSelectedExpiry(exp)}
              className={cn(
                "text-xs px-3 py-1 rounded border font-mono transition-colors",
                (selectedExpiry ?? metrics.expiries[0]) === exp
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:border-border/80 hover:text-foreground"
              )}
            >{exp}</button>
          ))}
        </div>
      )}

      {/* OI Bar Chart */}
      {chain && displayStrikes.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">OI Distribution (Calls vs Puts)</div>
          <div className="flex flex-col gap-1 max-h-80 overflow-y-auto pr-1">
            {[...displayStrikes].reverse().map(s => {
              const isAtm = s.strikePrice === atm
              const callWidth = (s.call.oi / maxCallOI) * 50
              const putWidth = (s.put.oi / maxPutOI) * 50
              return (
                <div key={s.strikePrice} className={cn("flex items-center gap-1 py-0.5", isAtm && "bg-primary/5 rounded")}>
                  <div className="w-28 flex justify-end">
                    <div className="h-4 bg-destructive/60 rounded-sm" style={{ width: `${callWidth}%`, minWidth: callWidth > 0 ? "2px" : "0" }} title={`Call OI: ${formatLargeNumber(s.call.oi)}`} />
                  </div>
                  <div className={cn("w-20 text-center text-xs font-mono font-semibold shrink-0", isAtm ? "text-primary border border-primary/30 rounded px-1" : "text-muted-foreground")}>
                    {s.strikePrice.toLocaleString("en-IN")}
                    {isAtm && <span className="ml-1 text-[9px] text-primary">ATM</span>}
                  </div>
                  <div className="w-28 flex justify-start">
                    <div className="h-4 bg-success/60 rounded-sm" style={{ width: `${putWidth}%`, minWidth: putWidth > 0 ? "2px" : "0" }} title={`Put OI: ${formatLargeNumber(s.put.oi)}`} />
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex items-center justify-center gap-6 mt-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-destructive/60 inline-block" /> Calls</div>
            <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-success/60 inline-block" /> Puts</div>
          </div>
        </div>
      )}

      {/* Option Chain Table */}
      {!chain ? (
        <div className="h-64 animate-pulse rounded-lg border border-border bg-muted" />
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium px-4 py-3 border-b border-border flex items-center justify-between">
            <span>Option Chain — Spot: {chain.spotPrice.toFixed(2)}</span>
            <span className="font-mono">{expiry}</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-right py-2 px-3 text-muted-foreground font-medium" colSpan={4}>CALLS</th>
                  <th className="py-2 px-3 text-center text-primary font-bold">STRIKE</th>
                  <th className="text-left py-2 px-3 text-muted-foreground font-medium" colSpan={4}>PUTS</th>
                </tr>
                <tr className="border-b border-border bg-muted/20 text-muted-foreground">
                  <th className="text-right py-1.5 px-2">OI</th>
                  <th className="text-right py-1.5 px-2">Vol</th>
                  <th className="text-right py-1.5 px-2">IV</th>
                  <th className="text-right py-1.5 px-2 text-destructive">LTP</th>
                  <th className="text-center py-1.5 px-3" />
                  <th className="text-left py-1.5 px-2 text-success">LTP</th>
                  <th className="text-left py-1.5 px-2">IV</th>
                  <th className="text-left py-1.5 px-2">Vol</th>
                  <th className="text-left py-1.5 px-2">OI</th>
                </tr>
              </thead>
              <tbody>
                {[...displayStrikes].reverse().map(s => {
                  const isAtm = s.strikePrice === atm
                  const maxPain = metrics?.maxPain === s.strikePrice
                  return (
                    <tr key={s.strikePrice} className={cn(
                      "border-b border-border/50 hover:bg-muted/20 transition-colors",
                      isAtm && "bg-primary/5",
                      maxPain && "bg-warning/5"
                    )}>
                      <td className="text-right py-1.5 px-2 text-muted-foreground">{formatLargeNumber(s.call.oi)}</td>
                      <td className="text-right py-1.5 px-2 text-muted-foreground">{formatLargeNumber(s.call.volume)}</td>
                      <td className="text-right py-1.5 px-2">{s.call.iv.toFixed(1)}%</td>
                      <td className={cn("text-right py-1.5 px-2 font-semibold", s.call.oiChange > 0 ? "text-destructive" : "text-success")}>{s.call.ltp.toFixed(2)}</td>
                      <td className="text-center py-1.5 px-3">
                        <span className={cn("font-bold", isAtm ? "text-primary" : "text-foreground")}>
                          {s.strikePrice.toLocaleString("en-IN")}
                          {isAtm && <span className="ml-1 text-[9px] text-primary font-normal">ATM</span>}
                          {maxPain && <span className="ml-1 text-[9px] text-warning font-normal">MP</span>}
                        </span>
                      </td>
                      <td className={cn("text-left py-1.5 px-2 font-semibold", s.put.oiChange > 0 ? "text-success" : "text-destructive")}>{s.put.ltp.toFixed(2)}</td>
                      <td className="text-left py-1.5 px-2">{s.put.iv.toFixed(1)}%</td>
                      <td className="text-left py-1.5 px-2 text-muted-foreground">{formatLargeNumber(s.put.volume)}</td>
                      <td className="text-left py-1.5 px-2 text-muted-foreground">{formatLargeNumber(s.put.oi)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
