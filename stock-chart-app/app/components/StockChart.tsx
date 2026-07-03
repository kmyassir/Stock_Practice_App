"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  type CandlestickData,
  type LineData,
  type Time,
} from "lightweight-charts";
import { sma, ema } from "../lib/indicators";

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
    const smaSeries = chart.addSeries(LineSeries, { color: "blue", lineWidth: 1 });
    const emaSeries = chart.addSeries(LineSeries, { color: "orange", lineWidth: 1 });

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

        const sma20 = sma(raw.close, 20);
        const ema20 = ema(raw.close, 20);

        const toLineData = (values: (number | null)[]): LineData<Time>[] =>
          raw.dates
            .map((date, i) => ({ time: date as Time, value: values[i] }))
            .filter((point): point is LineData<Time> => point.value !== null);

        smaSeries.setData(toLineData(sma20));
        emaSeries.setData(toLineData(ema20));

        chart.timeScale().fitContent();
      });

    return () => chart.remove();
  }, []);

  return <div ref={containerRef} className="w-full" />;
}
