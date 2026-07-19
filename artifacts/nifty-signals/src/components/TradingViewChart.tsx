import { useEffect, useRef } from "react";
import {
  createChart,
  ColorType,
  CandlestickSeries,
} from "lightweight-charts";

type Props = {
  candles: any[];
};

export default function TradingViewChart({ candles }: Props) {
  const chartContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 400,
      timeScale: {
  timeVisible: true,
  secondsVisible: false,
},
      layout: {
        background: {
          type: ColorType.Solid,
          color: "#ffffff",
        },
        textColor: "#333",
      },
    });
const chartData = [...candles]
  .map((c: any) => ({
    time: Math.floor(new Date(c.time).getTime() / 1000),
    open: Number(c.open),
    high: Number(c.high),
    low: Number(c.low),
    close: Number(c.close),
  }))
  .sort((a: any, b: any) => Number(a.time) - Number(b.time));
    const series = chart.addSeries(CandlestickSeries);
    series.setData(chartData as any);
    chart.timeScale().fitContent();

    return () => {
      chart.remove();
    };
  }, [candles]);

  return <div ref={chartContainerRef} className="w-full h-[400px]" />;
}