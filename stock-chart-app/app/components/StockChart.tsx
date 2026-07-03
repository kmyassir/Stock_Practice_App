"use client";

import { useEffect, useRef } from "react";
import {
  createChart,
  createSeriesMarkers,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type IChartApi,
  type SeriesMarker,
  type Time,
} from "lightweight-charts";
import { sma, ema, macd, parabolicSar, efi } from "../lib/indicators";

interface OhlcvPayload {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

function syncTimeScales(charts: IChartApi[]) {
  let syncing = false;
  charts.forEach((chart, index) => {
    chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
      if (syncing || !range) return;
      syncing = true;
      charts.forEach((other, otherIndex) => {
        if (otherIndex !== index) other.timeScale().setVisibleLogicalRange(range);
      });
      syncing = false;
    });
  });
}

export default function StockChart() {
  const containerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);
  const efiContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !macdContainerRef.current || !efiContainerRef.current) return;

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
    const macdHistogramSeries = macdChart.addSeries(HistogramSeries, {});

    const efiChart = createChart(efiContainerRef.current, {
      width: efiContainerRef.current.clientWidth,
      height: 150,
    });
    const efiHistogramSeries = efiChart.addSeries(HistogramSeries, {});

    syncTimeScales([chart, macdChart, efiChart]);

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

        const toHistogramData = (values: (number | null)[]): HistogramData<Time>[] =>
          raw.dates
            .map((date, i) => ({
              time: date as Time,
              value: values[i],
              color: (values[i] ?? 0) >= 0 ? "#26a69a" : "#ef5350",
            }))
            .filter(
              (point): point is { time: Time; value: number; color: string } =>
                point.value !== null
            );

        smaSeries.setData(toLineData(sma20));
        emaSeries.setData(toLineData(ema20));

        const psar = parabolicSar(raw.high, raw.low);
        const markers: SeriesMarker<Time>[] = raw.dates.map((date, i) => ({
          time: date as Time,
          position: psar[i].isUptrend ? "belowBar" : "aboveBar",
          color: psar[i].isUptrend ? "#26a69a" : "#ef5350",
          shape: "circle",
          size: 0.5,
        }));
        createSeriesMarkers(series, markers);

        const { macdLine, signalLine, histogram } = macd(raw.close);

        macdLineSeries.setData(toLineData(macdLine));
        signalLineSeries.setData(toLineData(signalLine));
        macdHistogramSeries.setData(toHistogramData(histogram));

        const efiValues = efi(raw.close, raw.volume);
        efiHistogramSeries.setData(toHistogramData(efiValues));

        chart.timeScale().fitContent();
        macdChart.timeScale().fitContent();
        efiChart.timeScale().fitContent();
      });

    return () => {
      chart.remove();
      macdChart.remove();
      efiChart.remove();
    };
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div ref={containerRef} className="w-full" />
      <div ref={macdContainerRef} className="w-full" />
      <div ref={efiContainerRef} className="w-full" />
    </div>
  );
}
