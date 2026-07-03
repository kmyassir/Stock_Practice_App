"use client";

import { useEffect, useRef } from "react";
import { createChart, CandlestickSeries, type CandlestickData, type Time } from "lightweight-charts";

interface OhlcvPayload {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
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
      .then((raw: OhlcvPayload) => {
        const data: CandlestickData<Time>[] = raw.dates.map((date, i) => ({
          time: date as Time,
          open: raw.open[i],
          high: raw.high[i],
          low: raw.low[i],
          close: raw.close[i],
        }));
        series.setData(data);
        chart.timeScale().fitContent();
      });

    return () => chart.remove();
  }, []);

  return <div ref={containerRef} className="w-full" />;
}
