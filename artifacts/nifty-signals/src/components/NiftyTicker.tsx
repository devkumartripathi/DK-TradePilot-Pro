import * as React from "react"
import { useGetNiftyData, getGetNiftyDataQueryKey } from "@workspace/api-client-react"
import { ArrowDown, ArrowUp, Clock, Minus } from "lucide-react"
import { Badge } from "./ui/badge"
import { cn, formatCurrency, formatPercent } from "@/lib/utils"

export function NiftyTicker() {
  const { data: nifty, isFetching } = useGetNiftyData({
    query: { refetchInterval: 3000, queryKey: getGetNiftyDataQueryKey() }
  });

  const [time, setTime] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (!nifty) {
    return <div className="h-20 w-full animate-pulse bg-muted rounded-lg border border-border" />
  }

  const isUp = nifty.change >= 0;
  const TrendIcon = nifty.trend === "BULLISH" ? ArrowUp : nifty.trend === "BEARISH" ? ArrowDown : Minus;

  return (
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 p-4 rounded-lg border border-border bg-card shadow-sm">
      <div className="flex items-center gap-4">
        <div>
          <h2 className="text-xs text-muted-foreground font-medium uppercase tracking-widest mb-0.5">NIFTY 50</h2>
          <div className="flex items-baseline gap-3">
            <span className={cn("text-3xl font-bold font-mono tracking-tight", isUp ? "text-success" : "text-destructive")}>
              {formatCurrency(nifty.ltp)}
            </span>
            <span className={cn("text-sm font-medium flex items-center gap-0.5", isUp ? "text-success" : "text-destructive")}>
              {isUp ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              {Math.abs(nifty.change).toFixed(2)} ({Math.abs(nifty.changePercent).toFixed(2)}%)
            </span>
          </div>
        </div>

        <div className="h-10 w-px bg-border hidden sm:block mx-2" />

        <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-0.5 text-sm font-mono">
          {[
            { label: "Open", value: nifty.open.toFixed(2), color: "" },
            { label: "High", value: nifty.dayHigh.toFixed(2), color: "text-success" },
            { label: "Low", value: nifty.dayLow.toFixed(2), color: "text-destructive" },
            { label: "Prev", value: nifty.close.toFixed(2), color: "" },
          ].map(({ label, value, color }) => (
            <div key={label} className="flex flex-col">
              <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider">{label}</span>
              <span className={cn("text-sm", color)}>{value}</span>
            </div>
          ))}
        </div>

        <div className="hidden lg:grid grid-cols-2 gap-x-6 gap-y-0.5 text-sm font-mono">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider">52W High</span>
            <span className="text-success">{nifty.weekHigh52.toFixed(2)}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-foreground font-sans uppercase tracking-wider">52W Low</span>
            <span className="text-destructive">{nifty.weekLow52.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full md:w-auto justify-between md:justify-end">
        <div className="flex items-center gap-2">
          <Badge variant={nifty.marketStatus === "OPEN" ? "success" : "secondary"}>
            {nifty.marketStatus === "OPEN" && <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />}
            {nifty.marketStatus}
          </Badge>
          <Badge variant={nifty.trend === "BULLISH" ? "success" : nifty.trend === "BEARISH" ? "destructive" : "secondary"}>
            <TrendIcon className="w-3 h-3 mr-1" />
            {nifty.trend}
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground flex items-center gap-1 font-mono relative">
          <Clock className="w-3 h-3" />
          {time.toLocaleTimeString("en-IN", { hour12: false })} IST
          {isFetching && (
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-ping ml-1" title="Live" />
          )}
        </div>
      </div>
    </div>
  );
}
