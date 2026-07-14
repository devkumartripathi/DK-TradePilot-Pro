import * as React from "react"
import { useGetSmcAnalysis, getGetSmcAnalysisQueryKey } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Activity, ArrowDown, ArrowUp, Layers, Shield, Target, TrendingUp } from "lucide-react"

function SectionCard({ title, icon: Icon, children }: { title: string; icon?: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border bg-card">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        {Icon && <Icon className="w-4 h-4 text-primary" />}
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function SMC() {
  const { data: smc, isLoading } = useGetSmcAnalysis({
    query: { refetchInterval: 15000, queryKey: getGetSmcAnalysisQueryKey() }
  })

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[1,2,3,4,5,6].map(i => <div key={i} className="h-48 animate-pulse rounded-lg border border-border bg-muted" />)}
      </div>
    )
  }

  if (!smc) return null

  const { marketStructure: ms, bos, choch, liquidity, orderBlocks, fairValueGaps, bias, keyLevels } = smc

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Layers className="w-5 h-5 text-primary" />
          <h1 className="text-xl font-bold tracking-tight">Smart Money Concepts</h1>
        </div>
        <Badge
          variant={bias === "BULLISH" ? "success" : bias === "BEARISH" ? "destructive" : "secondary"}
          className="text-sm px-4 py-1.5 font-bold"
        >
          {bias === "BULLISH" ? <ArrowUp className="w-4 h-4 mr-1" /> : bias === "BEARISH" ? <ArrowDown className="w-4 h-4 mr-1" /> : null}
          {bias} BIAS
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {/* Market Structure */}
        <SectionCard title="Market Structure" icon={TrendingUp}>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <Badge variant={ms.trend === "UPTREND" ? "success" : ms.trend === "DOWNTREND" ? "destructive" : "secondary"} className="text-xs">
                {ms.trend}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{ms.phase}</span>
            </div>
            <div className="flex gap-2 flex-wrap">
              {ms.higherHigh && <span className="text-[11px] px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 font-mono">HH</span>}
              {ms.higherLow && <span className="text-[11px] px-2 py-0.5 rounded bg-success/10 text-success border border-success/20 font-mono">HL</span>}
              {ms.lowerHigh && <span className="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-mono">LH</span>}
              {ms.lowerLow && <span className="text-[11px] px-2 py-0.5 rounded bg-destructive/10 text-destructive border border-destructive/20 font-mono">LL</span>}
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs font-mono">
              <div className="bg-muted/40 rounded p-2">
                <div className="text-muted-foreground mb-0.5">Swing High</div>
                <div className="text-success font-semibold">{ms.currentSwingHigh.toFixed(2)}</div>
              </div>
              <div className="bg-muted/40 rounded p-2">
                <div className="text-muted-foreground mb-0.5">Swing Low</div>
                <div className="text-destructive font-semibold">{ms.currentSwingLow.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </SectionCard>

        {/* BOS */}
        <SectionCard title="Break of Structure (BOS)" icon={Activity}>
          {bos.length === 0 ? (
            <p className="text-xs text-muted-foreground">No BOS events detected</p>
          ) : (
            <div className="flex flex-col gap-2">
              {bos.map((b, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={b.direction === "BULLISH" ? "success" : "destructive"} className="text-[10px]">{b.direction}</Badge>
                    <Badge variant={b.strength === "STRONG" ? "default" : "secondary"} className="text-[10px]">{b.strength}</Badge>
                  </div>
                  <span className="font-mono font-semibold">{b.level.toFixed(2)}</span>
                  <span className="text-muted-foreground font-mono">{new Date(b.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* CHOCH */}
        <SectionCard title="Change of Character (CHOCH)" icon={Activity}>
          {choch.length === 0 ? (
            <p className="text-xs text-muted-foreground">No CHOCH events detected</p>
          ) : (
            <div className="flex flex-col gap-2">
              {choch.map((c, i) => (
                <div key={i} className="flex items-center justify-between text-xs border-b border-border pb-2 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2">
                    <Badge variant={c.direction === "BULLISH" ? "success" : "destructive"} className="text-[10px]">{c.direction}</Badge>
                    <Badge variant={c.strength === "STRONG" ? "default" : "secondary"} className="text-[10px]">{c.strength}</Badge>
                  </div>
                  <span className="font-mono font-semibold">{c.level.toFixed(2)}</span>
                  <span className="text-muted-foreground font-mono">{new Date(c.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* Order Blocks */}
        <SectionCard title="Order Blocks" icon={Layers}>
          <div className="flex flex-col gap-2">
            {orderBlocks.map(ob => (
              <div key={ob.id} className={cn("rounded-md border p-2 text-xs", ob.mitigated ? "opacity-50 border-border" : ob.type === "BULLISH" ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={ob.type === "BULLISH" ? "success" : "destructive"} className="text-[10px]">{ob.type}</Badge>
                    <Badge variant={ob.strength === "STRONG" ? "default" : "secondary"} className="text-[10px]">{ob.strength}</Badge>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-muted-foreground">{ob.timeframe}</span>
                    {ob.mitigated && <Badge variant="secondary" className="text-[10px]">MITIGATED</Badge>}
                  </div>
                </div>
                <div className="font-mono">{ob.bottom.toFixed(2)} – {ob.top.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Fair Value Gaps */}
        <SectionCard title="Fair Value Gaps (FVG)" icon={Target}>
          <div className="flex flex-col gap-2">
            {fairValueGaps.map(fvg => (
              <div key={fvg.id} className={cn("rounded-md border p-2 text-xs", fvg.filled ? "opacity-50 border-border" : fvg.type === "BULLISH" ? "border-success/30 bg-success/5" : "border-destructive/30 bg-destructive/5")}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-1.5">
                    <Badge variant={fvg.type === "BULLISH" ? "success" : "destructive"} className="text-[10px]">{fvg.type}</Badge>
                    {fvg.filled && <Badge variant="secondary" className="text-[10px]">FILLED</Badge>}
                  </div>
                  <span className="font-mono">{fvg.bottom.toFixed(2)} – {fvg.top.toFixed(2)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className={cn("h-full rounded-full", fvg.type === "BULLISH" ? "bg-success" : "bg-destructive")}
                      style={{ width: `${fvg.fillPercent}%` }}
                    />
                  </div>
                  <span className="text-muted-foreground text-[10px]">{fvg.fillPercent.toFixed(0)}% filled</span>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>

        {/* Liquidity */}
        <SectionCard title="Liquidity" icon={Shield}>
          <div className="flex flex-col gap-3">
            <div>
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Buy-Side Liquidity (BSL)</div>
              <div className="flex flex-col gap-1">
                {liquidity.buySideLiquidity.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-success inline-block" />
                    <span className="text-success ml-2 flex-1">{l.toFixed(2)}</span>
                    <span className="text-muted-foreground text-[10px]">BSL</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Sell-Side Liquidity (SSL)</div>
              <div className="flex flex-col gap-1">
                {liquidity.sellSideLiquidity.map((l, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
                    <span className="text-destructive ml-2 flex-1">{l.toFixed(2)}</span>
                    <span className="text-muted-foreground text-[10px]">SSL</span>
                  </div>
                ))}
              </div>
            </div>
            {liquidity.liquiditySweeps.length > 0 && (
              <div className="border-t border-border pt-3">
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Liquidity Sweeps</div>
                {liquidity.liquiditySweeps.map((s, i) => (
                  <div key={i} className="flex items-center justify-between text-xs font-mono">
                    <Badge variant={s.type === "BSL_SWEEP" ? "success" : "destructive"} className="text-[10px]">{s.type}</Badge>
                    <span>{s.level.toFixed(2)}</span>
                    <span className="text-muted-foreground">{new Date(s.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: false })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </SectionCard>

        {/* Key Levels */}
        <div className="md:col-span-2 xl:col-span-3">
          <SectionCard title="Key Price Levels" icon={Target}>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3">
              {keyLevels.map((kl, i) => (
                <div key={i} className={cn("rounded-md border p-3 text-center",
                  kl.type === "SUPPORT" ? "border-success/30 bg-success/5" :
                  kl.type === "RESISTANCE" ? "border-destructive/30 bg-destructive/5" :
                  "border-primary/30 bg-primary/5"
                )}>
                  <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">{kl.label}</div>
                  <div className={cn("text-base font-bold font-mono",
                    kl.type === "SUPPORT" ? "text-success" : kl.type === "RESISTANCE" ? "text-destructive" : "text-primary"
                  )}>{kl.level.toFixed(2)}</div>
                  <div className="flex items-center justify-center gap-1 mt-1">
                    <Badge variant={kl.type === "SUPPORT" ? "success" : kl.type === "RESISTANCE" ? "destructive" : "default"} className="text-[10px]">{kl.type}</Badge>
                    <Badge variant="secondary" className="text-[10px]">{kl.strength}</Badge>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>
        </div>
      </div>
    </div>
  )
}
