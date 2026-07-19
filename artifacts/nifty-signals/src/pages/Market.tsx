import * as React from "react"
import { useGetCandles, useGetVwap, getGetCandlesQueryKey, getGetVwapQueryKey } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency } from "@/lib/utils"
import TradingViewChart from "@/components/TradingViewChart";
import { BarChart2, TrendingDown, TrendingUp } from "lucide-react"
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from "recharts"

type Timeframe =
  | "1m"
  | "3m"
  | "5m"
  | "10m"
  | "15m"
  | "30m"
  | "45m"
  | "1h"
  | "2h"
  | "4h"
  | "1d"
  | "1w"
  | "1M"
  | "3M"

const TIMEFRAMES: Timeframe[] = [
  "1m",
  "3m",
  "5m",
  "10m",
  "15m",
  "30m",
  "45m",
  "1h",
  "2h",
  "4h",
  "1d",
  "1w",
  "1M",
  "3M",
]

function CustomTooltip({ active, payload }: { active?: boolean; payload?: Array<{ payload: { time: string; open: number; high: number; low: number; close: number; volume: number } }> }) {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  const isUp = d.close >= d.open
  return (
    <div className="bg-card border border-border rounded-lg p-3 text-xs font-mono shadow-xl">
      <div className="text-muted-foreground mb-1">{new Date(d.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
        <div><span className="text-muted-foreground">O </span><span>{d.open.toFixed(2)}</span></div>
        <div><span className="text-success">H </span><span className="text-success">{d.high.toFixed(2)}</span></div>
        <div><span className="text-destructive">L </span><span className="text-destructive">{d.low.toFixed(2)}</span></div>
        <div><span className={isUp ? "text-success" : "text-destructive"}>C </span><span className={isUp ? "text-success" : "text-destructive"}>{d.close.toFixed(2)}</span></div>
      </div>
      <div className="text-muted-foreground mt-1">Vol: {(d.volume / 1000).toFixed(0)}K</div>
    </div>
  )
}

export default function Market() {
  const [timeframe, setTimeframe] = React.useState<Timeframe>("5m")
const limit =
  timeframe === "1m" ? 120 :
  timeframe === "3m" ? 120 :
  timeframe === "5m" ? 120 :
  timeframe === "10m" ? 100 :
  timeframe === "15m" ? 100 :
  timeframe === "30m" ? 80 :
  timeframe === "45m" ? 80 :
  timeframe === "1h" ? 72 :
  timeframe === "2h" ? 60 :
  timeframe === "4h" ? 60 :
  timeframe === "1d" ? 90 :
  timeframe === "1w" ? 104 :
  timeframe === "1M" ? 120 :
  60

 const { data: candles } = useGetCandles(
  {
    timeframe: timeframe as any,
    limit,
  },
  {
    query: {
      refetchInterval: 1000,
      queryKey: getGetCandlesQueryKey({
        timeframe: timeframe as any,
        limit,
      }),
    },
  }
)
  const { data: vwap } = useGetVwap({
    query: { refetchInterval: 1000, queryKey: getGetVwapQueryKey() }
  })

  const chartData = (candles ?? []).map(c => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume,
    // For bar: range low to high
    wick: [c.low, c.high] as [number, number],
    // Body
    body: [Math.min(c.open, c.close), Math.max(c.open, c.close)] as [number, number],
    isUp: c.close >= c.open,
    barColor: c.close >= c.open ? "success" : "destructive",
  }))

  const prices = chartData.flatMap(c => [c.low, c.high])
  const yMin = prices.length ? Math.min(...prices) - 50 : undefined
  const yMax = prices.length ? Math.max(...prices) + 50 : undefined

  const lastCandle = chartData[chartData.length - 1]
  const firstCandle = chartData[0]
  const dayChange = lastCandle && firstCandle ? lastCandle.close - firstCandle.open : 0
  const dayChangePct = firstCandle ? (dayChange / firstCandle.open) * 100 : 0

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BarChart2 className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Market Overview</h1>
        </div>
        <div className="flex items-center gap-1">
          {TIMEFRAMES.map(tf => (
            <button
              key={tf}
              onClick={() => setTimeframe(tf)}
              className={cn(
                "text-xs px-3 py-1.5 rounded border font-mono transition-colors",
                timeframe === tf
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              )}
            >{tf}</button>
          ))}
        </div>
      </div>

      {/* VWAP Metrics */}
      {vwap && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">VWAP</div>
            <div className="text-lg font-bold font-mono text-primary">{vwap.vwap.toFixed(2)}</div>
            <Badge variant={vwap.priceVsVwap === "ABOVE" ? "success" : vwap.priceVsVwap === "BELOW" ? "destructive" : "secondary"} className="text-[10px] mt-1">
              Price {vwap.priceVsVwap}
            </Badge>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Upper Bands</div>
            <div className="flex flex-col gap-0.5 font-mono text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">B1</span><span className="text-warning">{vwap.upperBand1.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">B2</span><span className="text-destructive">{vwap.upperBand2.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Lower Bands</div>
            <div className="flex flex-col gap-0.5 font-mono text-xs">
              <div className="flex justify-between"><span className="text-muted-foreground">B1</span><span className="text-warning">{vwap.lowerBand1.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">B2</span><span className="text-success">{vwap.lowerBand2.toFixed(2)}</span></div>
            </div>
          </div>
          <div className="rounded-lg border border-border bg-card p-3">
            <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">VWAP Trend</div>
            <div className={cn("text-sm font-semibold flex items-center gap-1 mt-1",
              vwap.vwapTrend === "RISING" ? "text-success" : vwap.vwapTrend === "FALLING" ? "text-destructive" : "text-muted-foreground"
            )}>
              {vwap.vwapTrend === "RISING" ? <TrendingUp className="w-4 h-4" /> : vwap.vwapTrend === "FALLING" ? <TrendingDown className="w-4 h-4" /> : null}
              {vwap.vwapTrend}
            </div>
            {lastCandle && (
              <div className={cn("text-xs font-mono mt-1", dayChange >= 0 ? "text-success" : "text-destructive")}>
                {dayChange >= 0 ? "+" : ""}{dayChange.toFixed(2)} ({dayChangePct.toFixed(2)}%)
              </div>
            )}
          </div>
        </div>
      )}

      {/* Candlestick Chart */}
<div className="rounded-lg border border-border bg-card p-4">
  <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-4">
    Nifty 50 · {timeframe} Chart
    {lastCandle && (
      <span
        className={cn(
          "ml-3 font-mono font-bold",
          lastCandle.isUp ? "text-success" : "text-destructive"
        )}
      >
        {lastCandle.close.toFixed(2)}
      </span>
    )}
  </div>

  {!candles ? (
    <div className="h-80 animate-pulse bg-muted rounded" />
  ) : (
   <TradingViewChart candles={candles} />
  )}

  <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
    <div className="flex items-center gap-1">
      TradingView Chart (Work in Progress)
    </div>
</div>
</div>
      {/* Volume Bar Chart */}
      {candles && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-3">Volume</div>
          <div className="h-24">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <XAxis dataKey="time" hide />
                <YAxis hide />
                <Bar dataKey="volume" maxBarSize={6}>
                  {chartData.map((entry, index) => (
                    <Cell
                      key={`vol-${index}`}
                      fill={entry.isUp ? "hsl(142 71% 45% / 0.6)" : "hsl(348 83% 47% / 0.6)"}
                    />
                  ))}
                </Bar>
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
)
}
