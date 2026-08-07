import * as React from "react"
import { Link, useLocation } from "wouter"
import { Activity, BarChart2, CandlestickChart, Crosshair, LayoutDashboard, RefreshCw, } from "lucide-react"
import { cn } from "@/lib/utils"

import { useQueryClient } from "@tanstack/react-query"
import {
  getGetNiftyDataQueryKey,
  getGetOptionsMetricsQueryKey,
  getGetSmcAnalysisQueryKey,
  getGetTradeSignalsQueryKey,
  getGetVwapQueryKey,
  getGetFyersAnalysisQueryKey,
} from "@workspace/api-client-react"
import { postJson } from "@/lib/api"

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const queryClient = useQueryClient();
const REFRESH_SECONDS = 15;

const [lastUpdated, setLastUpdated] = React.useState(new Date());
const [countdown, setCountdown] = React.useState(REFRESH_SECONDS);

React.useEffect(() => {
  const timer = setInterval(() => {
    setCountdown((prev) => {
      if (prev <= 1) {
        setLastUpdated(new Date());
        return REFRESH_SECONDS;
      }
      return prev - 1;
    });
  }, 1000);

  return () => clearInterval(timer);
}, []);

const handleRefresh = async () => {
  console.log("Manual Refresh Clicked");

  try {
    await postJson("/api/signals/refresh");

    await Promise.all([
      queryClient.invalidateQueries({ queryKey: getGetNiftyDataQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetOptionsMetricsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetSmcAnalysisQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetTradeSignalsQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetVwapQueryKey() }),
      queryClient.invalidateQueries({ queryKey: getGetFyersAnalysisQueryKey() }),
    ]);
  } catch (error) {
    console.error("Manual refresh failed:", error);
  }
};


  const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/signals", label: "Trade Signals", icon: Crosshair },
    { href: "/smc", label: "SMC Analysis", icon: Activity },
    { href: "/options", label: "Options", icon: BarChart2 },
    { href: "/market", label: "Market", icon: CandlestickChart },
  ];

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background text-foreground grid-bg relative">
      <div className="fixed inset-0 z-0 bg-background/90 pointer-events-none" />
      
      <header className="relative z-10 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary/20 flex items-center justify-center text-primary border border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.3)]">
              <Activity className="w-5 h-5" />
            </div>
            <h1 className="font-mono font-bold text-xl tracking-tight hidden sm:block">
              NIFTY<span className="text-primary">AI</span>
            </h1>
          </div>
          
          <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto no-scrollbar">
            {navItems.map((item) => {
              const isActive = location === item.href;
              const Icon = item.icon;
              return (
                <Link key={item.href} href={item.href} className={cn(
                  "flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap",
                  isActive 
                    ? "bg-primary/10 text-primary border border-primary/20" 
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}>
                  <Icon className="w-4 h-4" />
                  <span className="hidden md:inline">{item.label}</span>
                </Link>
              );
            })}
          </nav>
          <div className="hidden xl:flex items-center gap-3 ml-4 text-xs font-mono">
  <span className="text-green-500 font-semibold">🟢 LIVE</span>

  <span className="text-muted-foreground">
    Last: {lastUpdated.toLocaleTimeString()}
  </span>

  <span className="text-primary">
    Next: {countdown}s
  </span>

  <button
    onClick={handleRefresh}
    className="flex items-center gap-1 px-2 py-1 rounded border border-border hover:bg-muted"
  >
    <RefreshCw className="w-3 h-3" />
    Refresh
  </button>
</div>
        </div>
      </header>

      <main className="relative z-10 flex-1 container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {children}
      </main>
    </div>
  )
}
