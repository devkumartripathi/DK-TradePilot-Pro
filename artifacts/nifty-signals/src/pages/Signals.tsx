import * as React from "react"
import { useGetTradeSignals, getGetTradeSignalsQueryKey } from "@workspace/api-client-react"
import { Badge } from "@/components/ui/badge"
import { cn, formatCurrency } from "@/lib/utils"
import {
  Activity, AlertTriangle, ArrowDown, ArrowUp, Bell, BellOff,
  CheckCircle, ChevronDown, ChevronUp, Clock, Crosshair,
  RefreshCw, Send, Settings, Shield, TrendingUp, XCircle, Zap,
} from "lucide-react"

// ─── Types ─────────────────────────────────────────────────────────────────────

type SignalType = "CALL_BUY" | "CALL_SELL" | "PUT_BUY" | "PUT_SELL"

interface TelegramStatus { enabled: boolean; configured: boolean; chatId: string }

// ─── Signal type visuals ────────────────────────────────────────────────────

const SIGNAL_STYLES: Record<SignalType, {
  label: string; bg: string; border: string; text: string; glow: string; badge: string;
}> = {
  CALL_BUY:  { label: "CALL BUY",  bg: "bg-success/10",     border: "border-success/40",     text: "text-success",     glow: "shadow-[0_0_30px_rgba(34,197,94,0.18)]",  badge: "bg-success/15 border-success/40 text-success" },
  PUT_BUY:   { label: "PUT BUY",   bg: "bg-destructive/10", border: "border-destructive/40", text: "text-destructive", glow: "shadow-[0_0_30px_rgba(239,68,68,0.18)]",  badge: "bg-destructive/15 border-destructive/40 text-destructive" },
  CALL_SELL: { label: "CALL SELL", bg: "bg-warning/10",     border: "border-warning/40",     text: "text-warning",     glow: "shadow-[0_0_30px_rgba(245,158,11,0.18)]", badge: "bg-warning/15 border-warning/40 text-warning" },
  PUT_SELL:  { label: "PUT SELL",  bg: "bg-primary/10",     border: "border-primary/40",     text: "text-primary",     glow: "shadow-[0_0_30px_rgba(99,102,241,0.18)]", badge: "bg-primary/15 border-primary/40 text-primary" },
}

const SIGNAL_ICONS: Record<SignalType, React.ElementType> = {
  CALL_BUY: ArrowUp, PUT_BUY: ArrowDown, CALL_SELL: ArrowDown, PUT_SELL: ArrowUp,
}

// ─── Sub-components ─────────────────────────────────────────────────────────

function ConfidenceMeter({ score }: { score: number }) {
  const pct = Math.min(100, score)
  const color = score >= 95 ? "bg-success" : score >= 90 ? "bg-success/80" : "bg-warning"
  const label = score >= 95 ? "VERY HIGH" : score >= 90 ? "HIGH" : "MODERATE"
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground font-medium">AI Confidence Score</span>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-black font-mono text-success tabular-nums">{score.toFixed(1)}%</span>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-success/15 border border-success/40 text-success">{label}</span>
        </div>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden relative">
        <div
          className={cn("h-full rounded-full transition-all duration-700", color)}
          style={{ width: `${pct}%` }}
        />
        {/* Threshold marker at 90% */}
        <div className="absolute top-0 bottom-0 border-l-2 border-dashed border-warning/60" style={{ left: "90%" }} />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
        <span>0%</span>
        <span className="text-warning/70">90% threshold</span>
        <span>100%</span>
      </div>
    </div>
  )
}

function LevelCard({ label, value, sub, colorClass }: { label: string; value: number; sub?: string; colorClass: string }) {
  return (
    <div className="flex flex-col gap-0.5 bg-muted/40 rounded-lg p-3 border border-border">
      <span className="text-[10px] text-muted-foreground uppercase tracking-widest font-medium">{label}</span>
      <span className={cn("text-base font-black font-mono tabular-nums", colorClass)}>{value.toFixed(2)}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

function ScoreFactorRow({ name, score, maxScore, signal }: { name: string; score: number; maxScore: number; signal: string }) {
  const pct = (score / maxScore) * 100
  const color = pct >= 80 ? "bg-success" : pct >= 50 ? "bg-warning" : "bg-destructive"
  return (
    <div className="flex flex-col gap-1 py-2 border-b border-border/50 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-foreground/90 flex-1">{name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-20 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
          </div>
          <span className="text-[11px] font-mono font-bold text-muted-foreground w-10 text-right">
            {score}/{maxScore}
          </span>
        </div>
      </div>
      <p className="text-[10px] text-muted-foreground leading-relaxed">{signal}</p>
    </div>
  )
}

function IndicatorChip({ label, value, sub, ok }: { label: string; value: string; sub?: string; ok?: boolean | null }) {
  return (
    <div className={cn(
      "rounded-md border p-2 flex flex-col gap-0.5",
      ok === true ? "border-success/30 bg-success/5" : ok === false ? "border-destructive/30 bg-destructive/5" : "border-border bg-muted/30"
    )}>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <span className={cn("text-sm font-bold font-mono", ok === true ? "text-success" : ok === false ? "text-destructive" : "text-foreground")}>{value}</span>
      {sub && <span className="text-[10px] text-muted-foreground">{sub}</span>}
    </div>
  )
}

// ─── Telegram settings panel ─────────────────────────────────────────────────

function TelegramPanel() {
  const [status, setStatus] = React.useState<TelegramStatus | null>(null)
  const [open, setOpen] = React.useState(false)
  const [botToken, setBotToken] = React.useState("")
  const [chatId, setChatId] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [testing, setTesting] = React.useState(false)
  const [feedback, setFeedback] = React.useState<{ ok: boolean; msg: string } | null>(null)

  const baseUrl = import.meta.env.BASE_URL?.replace(/\/$/, "") ?? ""

  React.useEffect(() => {
    fetch(`${baseUrl}/api/signals/telegram/status`)
      .then(r => r.json())
      .then(d => setStatus(d as TelegramStatus))
      .catch(() => {})
  }, [baseUrl])

  async function save() {
    setSaving(true)
    setFeedback(null)
    try {
      const r = await fetch(`${baseUrl}/api/signals/telegram/config`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken, chatId, enabled: true }),
      })
      const d = await r.json() as { success: boolean; configured: boolean }
      setStatus(prev => prev ? { ...prev, enabled: true, configured: d.configured } : null)
      setFeedback({ ok: d.success, msg: d.success ? "Saved successfully." : "Save failed." })
    } finally { setSaving(false) }
  }

  async function test() {
    setTesting(true)
    setFeedback(null)
    try {
      const r = await fetch(`${baseUrl}/api/signals/telegram/test`, { method: "POST" })
      const d = await r.json() as { ok: boolean; error?: string }
      setFeedback({ ok: d.ok, msg: d.ok ? "Test message sent! ✅" : `Failed: ${d.error}` })
    } finally { setTesting(false) }
  }

  async function disable() {
    await fetch(`${baseUrl}/api/signals/telegram/config`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: false }),
    })
    setStatus(prev => prev ? { ...prev, enabled: false } : null)
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">Telegram Alerts</span>
          {status?.enabled && status.configured
            ? <span className="text-[10px] px-2 py-0.5 rounded-full bg-success/15 border border-success/30 text-success font-bold flex items-center gap-1"><Bell className="w-2.5 h-2.5" /> ACTIVE</span>
            : <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted border border-border text-muted-foreground flex items-center gap-1"><BellOff className="w-2.5 h-2.5" /> INACTIVE</span>
          }
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="border-t border-border px-4 py-4 flex flex-col gap-4">
          <div className="text-xs text-muted-foreground leading-relaxed bg-muted/30 rounded p-3 border border-border">
            <strong>Setup:</strong> Create a bot via <span className="text-primary">@BotFather</span> on Telegram → copy your bot token. 
            Then message <span className="text-primary">@userinfobot</span> to get your Chat ID. Signals fire automatically when confidence ≥ 90%.
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Bot Token</label>
              <input
                type="password"
                placeholder="1234567890:AAF..."
                value={botToken}
                onChange={e => setBotToken(e.target.value)}
                className="text-xs font-mono bg-muted/50 border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 transition-colors"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium text-muted-foreground">Chat ID</label>
              <input
                type="text"
                placeholder="-100123456789"
                value={chatId}
                onChange={e => setChatId(e.target.value)}
                className="text-xs font-mono bg-muted/50 border border-border rounded px-3 py-2 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/60 transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={save}
              disabled={saving || !botToken || !chatId}
              className="text-xs font-semibold px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-1.5"
            >
              <Settings className="w-3 h-3" />
              {saving ? "Saving…" : "Save Config"}
            </button>
            <button
              onClick={test}
              disabled={testing || !status?.configured}
              className="text-xs font-semibold px-4 py-2 rounded border border-border bg-muted/50 hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <Send className="w-3 h-3" />
              {testing ? "Sending…" : "Send Test"}
            </button>
            {status?.enabled && (
              <button onClick={disable} className="text-xs text-destructive hover:underline ml-auto">Disable alerts</button>
            )}
          </div>

          {feedback && (
            <div className={cn("text-xs px-3 py-2 rounded border flex items-center gap-2",
              feedback.ok ? "bg-success/10 border-success/30 text-success" : "bg-destructive/10 border-destructive/30 text-destructive"
            )}>
              {feedback.ok ? <CheckCircle className="w-3.5 h-3.5 shrink-0" /> : <XCircle className="w-3.5 h-3.5 shrink-0" />}
              {feedback.msg}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── NSE Integration readiness banner ────────────────────────────────────────

function NseBanner() {
  return (
    <div className="rounded-lg border border-primary/25 bg-primary/5 px-4 py-3 flex items-start gap-3">
      <Shield className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <div className="flex flex-col gap-0.5">
        <div className="text-xs font-bold text-primary">NSE Live Data Integration Ready</div>
        <p className="text-[11px] text-muted-foreground leading-relaxed">
          Architecture is plug-and-play for live NSE feeds. Replace the simulator in <span className="font-mono text-foreground/70">marketData.ts</span> with 
          Breeze API, Shoonya, or Zerodha Kite. All 15 indicators, scoring engine, and Telegram dispatch remain unchanged.
        </p>
      </div>
    </div>
  )
}

// ─── Main signal card ─────────────────────────────────────────────────────────

type Signal = {
  id: string; optionSignalType: string; direction: "BUY" | "SELL";
  instrument: string; optionType: string; strikePrice: number | null;
  optionLtp: number | null; expiry: string | null;
  entry: number; stopLoss: number; target1: number; target2: number; target3: number;
  riskReward: number; confidenceScore: number; confidenceLabel: string;
  rationale: string; smcSetup: string; status: string; timestamp: string;
  indicators: {
    rsi: number; atr: number; ema20: number; ema50: number; vwap: number;
    pcr: number; vix: number; callOI: number; putOI: number; volume: number; adx: number;
    rsiSignal: string; emaSignal: string; vwapPosition: string; volumeSignal: string;
  };
  scoreFactors: Array<{ name: string; score: number; maxScore: number; signal: string }>;
  telegramAlertSent: boolean;
}

function PremiumSignalCard({ signal }: { signal: Signal }) {
  const [showFactors, setShowFactors] = React.useState(false)
  const type = signal.optionSignalType as SignalType
  const style = SIGNAL_STYLES[type] ?? SIGNAL_STYLES.CALL_BUY
  const Icon = SIGNAL_ICONS[type] ?? ArrowUp
  const isBuy = signal.direction === "BUY"
  const ind = signal.indicators

  return (
    <div className={cn("rounded-xl border-2 bg-card p-6 flex flex-col gap-5 transition-all", style.border, style.glow)}>

      {/* ── Header ── */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          {/* Big signal type pill */}
          <div className={cn(
            "flex items-center gap-2.5 px-4 py-2.5 rounded-lg border font-black text-lg tracking-wide",
            style.badge
          )}>
            <Icon className="w-5 h-5" />
            {style.label}
          </div>
          <div>
            <div className="text-sm font-bold text-muted-foreground uppercase tracking-wider">{signal.instrument}</div>
            <div className={cn("text-xl font-black font-mono", style.text)}>
              {signal.strikePrice ?? "—"} {signal.optionType}
            </div>
            <div className="text-xs text-muted-foreground font-mono">
              {signal.expiry} · LTP <span className="text-foreground font-bold">₹{signal.optionLtp?.toFixed(2) ?? "—"}</span>
            </div>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={signal.status === "ACTIVE" ? "success" : "secondary"} className="flex items-center gap-1">
            <Zap className="w-3 h-3" />{signal.status}
          </Badge>
          <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {new Date(signal.timestamp).toLocaleTimeString("en-IN", { hour12: false })} IST
          </span>
        </div>
      </div>

      {/* ── Confidence meter ── */}
      <ConfidenceMeter score={signal.confidenceScore} />

      {/* ── Trade levels ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <LevelCard label="Entry" value={signal.entry} sub="Nifty spot" colorClass="text-foreground" />
        <LevelCard label="Stop Loss" value={signal.stopLoss} sub={`${Math.abs(signal.entry - signal.stopLoss).toFixed(0)} pts`} colorClass="text-destructive" />
        <LevelCard label="Target 1" value={signal.target1} sub={`${Math.abs(signal.target1 - signal.entry).toFixed(0)} pts`} colorClass="text-success" />
        <LevelCard label="Target 2" value={signal.target2} sub={`${Math.abs(signal.target2 - signal.entry).toFixed(0)} pts`} colorClass="text-success" />
        <div className="flex flex-col gap-0.5 bg-primary/10 rounded-lg p-3 border border-primary/30">
          <span className="text-[10px] text-primary/70 uppercase tracking-widest font-medium">Risk : Reward</span>
          <span className="text-base font-black font-mono text-primary">1 : {signal.riskReward.toFixed(1)}</span>
          <span className="text-[10px] text-muted-foreground">Favorable ratio</span>
        </div>
      </div>

      {/* ── SMC Setup tag ── */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] text-muted-foreground uppercase tracking-wider">ICT Setup:</span>
        <span className={cn("text-xs font-mono font-bold px-3 py-1 rounded-full border", style.badge)}>
          {signal.smcSetup}
        </span>
      </div>

      {/* ── Indicators grid ── */}
      <div>
        <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2.5">Technical Indicators</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
          <IndicatorChip label="RSI (14)" value={ind.rsi.toFixed(1)} sub={ind.rsiSignal} ok={isBuy ? (ind.rsi > 40 && ind.rsi < 70) : (ind.rsi > 30 && ind.rsi < 65)} />
          <IndicatorChip label="ATR (14)" value={`${ind.atr.toFixed(0)} pts`} sub="Volatility" ok={ind.atr >= 100 && ind.atr <= 160} />
          <IndicatorChip label="EMA 20" value={ind.ema20.toFixed(0)} sub={`vs EMA50 ${ind.ema50.toFixed(0)}`} ok={isBuy ? ind.ema20 > ind.ema50 : ind.ema20 < ind.ema50} />
          <IndicatorChip label="EMA 50" value={ind.ema50.toFixed(0)} sub={ind.emaSignal} ok={isBuy ? ind.ema20 > ind.ema50 : ind.ema20 < ind.ema50} />
          <IndicatorChip label="VWAP" value={ind.vwap.toFixed(0)} sub={ind.vwapPosition} ok={isBuy ? ind.vwapPosition === "ABOVE" : ind.vwapPosition === "BELOW"} />
          <IndicatorChip label="PCR" value={ind.pcr.toFixed(2)} sub={ind.pcr > 1.1 ? "Put Writing" : ind.pcr < 0.9 ? "Call Writing" : "Mixed"} ok={isBuy ? ind.pcr > 1.0 : ind.pcr < 1.0} />
          <IndicatorChip label="India VIX" value={ind.vix.toFixed(2)} sub={ind.vix > 18 ? "HIGH VOL" : ind.vix < 14 ? "LOW VOL" : "NORMAL"} ok={isBuy ? ind.vix < 18 : ind.vix > 14} />
          <IndicatorChip label="Call OI" value={`${(ind.callOI / 1e6).toFixed(1)}M`} sub="Contracts" ok={null} />
          <IndicatorChip label="Put OI" value={`${(ind.putOI / 1e6).toFixed(1)}M`} sub="Contracts" ok={null} />
          <IndicatorChip label="ADX" value={ind.adx.toFixed(0)} sub={ind.adx > 30 ? "Strong Trend" : "Weak Trend"} ok={ind.adx > 25} />
        </div>
      </div>

      {/* ── Analysis rationale ── */}
      <div className="rounded-lg bg-muted/30 border border-border px-4 py-3">
        <div className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">AI Analysis</div>
        <p className="text-xs text-foreground/80 leading-relaxed">{signal.rationale}</p>
      </div>

      {/* ── Score factors accordion ── */}
      <div className="rounded-lg border border-border bg-muted/10 overflow-hidden">
        <button
          onClick={() => setShowFactors(f => !f)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/20 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold">Scoring Breakdown</span>
            <span className="text-[10px] text-muted-foreground">({signal.scoreFactors.length} factors analysed)</span>
          </div>
          {showFactors ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
        </button>
        {showFactors && (
          <div className="border-t border-border px-4 py-2">
            {signal.scoreFactors.map(f => (
              <ScoreFactorRow key={f.name} {...f} />
            ))}
            <div className="flex items-center justify-between pt-3 mt-1">
              <span className="text-xs font-bold text-muted-foreground">Total Score</span>
              <span className="text-sm font-black font-mono text-success">
                {signal.scoreFactors.reduce((s, f) => s + f.score, 0)} / {signal.scoreFactors.reduce((s, f) => s + f.maxScore, 0)}
                <span className="text-muted-foreground ml-2 text-xs">= {signal.confidenceScore.toFixed(1)}%</span>
              </span>
            </div>
          </div>
        )}
      </div>

    </div>
  )
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function Signals() {
  const { data: signals, isLoading, refetch } = useGetTradeSignals({
    query: { refetchInterval: 10000, queryKey: getGetTradeSignalsQueryKey() }
  })

  const activeSignals = (signals?.signals ?? []) as unknown as Signal[]

  return (
    <div className="flex flex-col gap-5 pb-8">

      {/* ── Page header ── */}
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
          {signals && (
            <span className="text-xs text-muted-foreground font-mono">
              {signals.sessionTime} · {new Date(signals.generatedAt).toLocaleTimeString("en-IN", { hour12: false })} IST
            </span>
          )}
          <button
            onClick={() => refetch()}
            className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1.5 border border-border rounded px-3 py-1.5 hover:bg-muted transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
        </div>
      </div>

      {/* ── No trade zone banner ── */}
      {signals?.noTradeZone && (
        <div className="flex items-start gap-3 p-4 rounded-lg border border-warning/50 bg-warning/10">
          <AlertTriangle className="w-5 h-5 text-warning shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-warning text-sm">NO TRADE ZONE ACTIVE</div>
            <p className="text-xs text-warning/80 mt-0.5">{signals.noTradeReason}</p>
            <p className="text-xs text-muted-foreground mt-2">Lunch consolidation zone — low liquidity, erratic spreads. Wait for 13:30 IST resumption.</p>
          </div>
        </div>
      )}

      {/* ── Signal cards or empty state ── */}
      {isLoading ? (
        <div className="h-64 animate-pulse rounded-xl border-2 border-border bg-muted" />
      ) : activeSignals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center rounded-xl border-2 border-dashed border-border">
          <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
            <TrendingUp className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-semibold text-lg mb-1">No Signal Above 90% Confidence</h3>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            {signals?.noTradeReason
              ?? "The AI engine is scanning all 15 indicators across CALL BUY, CALL SELL, PUT BUY, and PUT SELL. Only the highest-probability setup above 90% confidence will appear here."}
          </p>
          {signals && (
            <div className="mt-5 grid grid-cols-2 gap-2">
              {(["CALL_BUY", "CALL_SELL", "PUT_BUY", "PUT_SELL"] as SignalType[]).map(t => (
                <div key={t} className={cn("text-xs px-3 py-1.5 rounded-full border", SIGNAL_STYLES[t].badge)}>
                  {SIGNAL_STYLES[t].label} — scanning
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        activeSignals.map(sig => <PremiumSignalCard key={sig.id} signal={sig} />)
      )}

      {/* ── Telegram + NSE panels ── */}
      <TelegramPanel />
      <NseBanner />

    </div>
  )
}
