"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type IChartApi,
  type Time,
} from "lightweight-charts";
import { sma, ema, macd } from "../lib/indicators";

interface OhlcvPayload {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

function syncTimeScales(a: IChartApi, b: IChartApi) {
  let syncing = false;
  a.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (syncing || !range) return;
    syncing = true;
    b.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  });
  b.timeScale().subscribeVisibleLogicalRangeChange((range) => {
    if (syncing || !range) return;
    syncing = true;
    a.timeScale().setVisibleLogicalRange(range);
    syncing = false;
  });
}

export default function StockChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !macdContainerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
    });
    const series = chart.addSeries(CandlestickSeries);
    const smaSeries = chart.addSeries(LineSeries, { color: "blue", lineWidth: 1 });
    const emaSeries = chart.addSeries(LineSeries, { color: "orange", lineWidth: 1 });

    const macdChart = createChart(macdContainerRef.current, {
      width: macdContainerRef.current.clientWidth,
      height: 150,
    });
    const macdLineSeries = macdChart.addSeries(LineSeries, { color: "blue", lineWidth: 1 });
    const signalLineSeries = macdChart.addSeries(LineSeries, { color: "orange", lineWidth: 1 });
    const histogramSeries = macdChart.addSeries(HistogramSeries, {});

    syncTimeScales(chart, macdChart);

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

        const { macdLine, signalLine, histogram } = macd(raw.close);

        macdLineSeries.setData(toLineData(macdLine));
        signalLineSeries.setData(toLineData(signalLine));

        const histogramData: HistogramData<Time>[] = raw.dates
          .map((date, i) => ({
            time: date as Time,
            value: histogram[i],
            color: (histogram[i] ?? 0) >= 0 ? "#26a69a" : "#ef5350",
          }))
          .filter(
            (point): point is { time: Time; value: number; color: string } =>
              point.value !== null
          );

        histogramSeries.setData(histogramData);

        chart.timeScale().fitContent();
        macdChart.timeScale().fitContent();
      });

    return () => {
      chart.remove();
      macdChart.remove();
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="w-full" />
      <div ref={macdContainerRef} className="w-full" />
    </div>
  );
}
