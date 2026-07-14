import * as React from "react"
import { Link, useLocation } from "wouter"
import { Activity, BarChart2, CandlestickChart, Crosshair, LayoutDashboard } from "lucide-react"
import { cn } from "@/lib/utils"

export default function Shell({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

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
        </div>
      </header>

      <main className="relative z-10 flex-1 container mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-6">
        {children}
      </main>
    </div>
  )
}
