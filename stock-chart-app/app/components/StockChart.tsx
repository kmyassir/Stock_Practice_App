"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type CandlestickData, type Time } from "lightweight-charts";

interface RawCandle {
  Date: string;
  Open: number;
  High: number;
  Low: number;
  Close: number;
  Volume: number;
}

export default function StockChart() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
    });
    const series = chart.addSeries(CandlestickSeries);

    fetch("/sample-stock.json")
      .then((res) => res.json())
      .then((raw: RawCandle[]) => {
        const data: CandlestickData<Time>[] = raw.map((candle) => ({
          time: candle.Date.slice(0, 10) as Time,
          open: candle.Open,
          high: candle.High,
          low: candle.Low,
          close: candle.Close,
        }));
        series.setData(data);
        chart.timeScale().fitContent();
      });

    return () => chart.remove();
  }, []);

  return <div ref={containerRef} className="w-full" />;
}
