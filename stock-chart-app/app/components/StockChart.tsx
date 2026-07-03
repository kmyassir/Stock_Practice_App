"use client";

import { useRef, useState, useEffect } from "react";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type WhitespaceData,
  type IChartApi,
  type ISeriesApi,
  type Time,
} from "lightweight-charts";
import { sma, ema, macd, parabolicSar, efi, type PsarPoint } from "../lib/indicators";

interface OhlcvPayload {
  dates: string[];
  open: number[];
  high: number[];
  low: number[];
  close: number[];
  volume: number[];
}

interface StockChartProps {
  ticker: string;
}

interface PreparedData {
  dates: string[];
  candles: CandlestickData<Time>[];
  sma20: (number | null)[];
  ema20: (number | null)[];
  psar: PsarPoint[];
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
  efiValues: (number | null)[];
}

interface SeriesHandles {
  candlestick: ISeriesApi<"Candlestick">;
  sma: ISeriesApi<"Line">;
  ema: ISeriesApi<"Line">;
  psar: ISeriesApi<"Line">;
  macdLine: ISeriesApi<"Line">;
  signalLine: ISeriesApi<"Line">;
  macdHistogram: ISeriesApi<"Histogram">;
}

// Every series on every chart must carry exactly one point per shared date
// index (a real value or a whitespace placeholder), never a filtered-down
// array — otherwise syncTimeScales' logical-range sync (which maps bar
// position, not calendar date, across charts) drifts out of alignment
// whenever one series has fewer points than another.
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

function prepareData(raw: OhlcvPayload): PreparedData {
  const candles: CandlestickData<Time>[] = raw.dates.map((date, i) => ({
    time: date as Time,
    open: raw.open[i],
    high: raw.high[i],
    low: raw.low[i],
    close: raw.close[i],
  }));

  const { macdLine, signalLine, histogram } = macd(raw.close);

  return {
    dates: raw.dates,
    candles,
    sma20: sma(raw.close, 20),
    ema20: ema(raw.close, 20),
    psar: parabolicSar(raw.high, raw.low),
    macdLine,
    signalLine,
    histogram,
    efiValues: efi(raw.close, raw.volume),
  };
}

// Picks a random reveal point with at least 30 candles of visible history and
// 90 candles of runway for a trade to play out. Falls back to whatever room
// exists for tickers with thin history (younger listings).
function pickStartIndex(n: number): number {
  const min = 30;
  const max = n - 91;
  if (max < min) return Math.min(min, n - 1);
  return min + Math.floor(Math.random() * (max - min + 1));
}

function lineDataAt(
  dates: string[],
  values: (number | null)[],
  i: number
): LineData<Time> | WhitespaceData<Time> {
  const value = values[i];
  const time = dates[i] as Time;
  return value === null ? { time } : { time, value };
}

function histogramDataAt(
  dates: string[],
  values: (number | null)[],
  i: number
): HistogramData<Time> | WhitespaceData<Time> {
  const value = values[i];
  const time = dates[i] as Time;
  if (value === null) return { time };
  return { time, value, color: value >= 0 ? "#26a69a" : "#ef5350" };
}

function psarDataAt(dates: string[], psar: PsarPoint[], i: number): LineData<Time> {
  return {
    time: dates[i] as Time,
    value: psar[i].value,
    color: psar[i].isUptrend ? "#26a69a" : "#ef5350",
  };
}

function formatEfi(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1e6) return `${(value / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)}K`;
  return value.toFixed(0);
}

export default function StockChart({ ticker }: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const seriesRef = useRef<SeriesHandles | null>(null);
  const dataRef = useRef<PreparedData | null>(null);

  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [totalCandles, setTotalCandles] = useState(0);
  const [currentEfi, setCurrentEfi] = useState<number | null>(null);

  useEffect(() => {
    if (!containerRef.current || !macdContainerRef.current) return;

    const chart = createChart(containerRef.current, {
      width: containerRef.current.clientWidth,
      height: 500,
    });
    const candlestick = chart.addSeries(CandlestickSeries);
    const smaSeries = chart.addSeries(LineSeries, { color: "blue", lineWidth: 1 });
    const emaSeries = chart.addSeries(LineSeries, { color: "orange", lineWidth: 1 });
    const psarSeries = chart.addSeries(LineSeries, {
      lineVisible: false,
      pointMarkersVisible: true,
      pointMarkersRadius: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const macdChart = createChart(macdContainerRef.current, {
      width: macdContainerRef.current.clientWidth,
      height: 150,
    });
    const macdLineSeries = macdChart.addSeries(LineSeries, { color: "blue", lineWidth: 1 });
    const signalLineSeries = macdChart.addSeries(LineSeries, { color: "orange", lineWidth: 1 });
    const macdHistogramSeries = macdChart.addSeries(HistogramSeries, {});

    syncTimeScales([chart, macdChart]);

    seriesRef.current = {
      candlestick,
      sma: smaSeries,
      ema: emaSeries,
      psar: psarSeries,
      macdLine: macdLineSeries,
      signalLine: signalLineSeries,
      macdHistogram: macdHistogramSeries,
    };

    fetch(`/data/ohlcv/${ticker}.json`)
      .then((res) => res.json())
      .then((raw: OhlcvPayload) => {
        const prepared = prepareData(raw);
        dataRef.current = prepared;

        const n = prepared.candles.length;
        const startIndex = pickStartIndex(n);
        const windowStart = Math.max(0, startIndex - 30);

        const lineSlice = (values: (number | null)[]): (LineData<Time> | WhitespaceData<Time>)[] => {
          const points: (LineData<Time> | WhitespaceData<Time>)[] = [];
          for (let i = windowStart; i <= startIndex; i++) {
            points.push(lineDataAt(prepared.dates, values, i));
          }
          return points;
        };

        const histogramSlice = (
          values: (number | null)[]
        ): (HistogramData<Time> | WhitespaceData<Time>)[] => {
          const points: (HistogramData<Time> | WhitespaceData<Time>)[] = [];
          for (let i = windowStart; i <= startIndex; i++) {
            points.push(histogramDataAt(prepared.dates, values, i));
          }
          return points;
        };

        const psarSlice: LineData<Time>[] = [];
        for (let i = windowStart; i <= startIndex; i++) {
          psarSlice.push(psarDataAt(prepared.dates, prepared.psar, i));
        }

        candlestick.setData(prepared.candles.slice(windowStart, startIndex + 1));
        smaSeries.setData(lineSlice(prepared.sma20));
        emaSeries.setData(lineSlice(prepared.ema20));
        psarSeries.setData(psarSlice);
        macdLineSeries.setData(lineSlice(prepared.macdLine));
        signalLineSeries.setData(lineSlice(prepared.signalLine));
        macdHistogramSeries.setData(histogramSlice(prepared.histogram));

        chart.timeScale().fitContent();
        macdChart.timeScale().fitContent();

        setTotalCandles(n);
        setRevealedIndex(startIndex);
        setCurrentEfi(prepared.efiValues[startIndex] ?? null);
      });

    return () => {
      chart.remove();
      macdChart.remove();
      seriesRef.current = null;
      dataRef.current = null;
    };
  }, [ticker]);

  const handleNextDay = () => {
    const series = seriesRef.current;
    const prepared = dataRef.current;
    if (!series || !prepared || revealedIndex === null) return;

    const nextIndex = revealedIndex + 1;
    if (nextIndex >= prepared.candles.length) return;

    series.candlestick.update(prepared.candles[nextIndex]);
    series.sma.update(lineDataAt(prepared.dates, prepared.sma20, nextIndex));
    series.ema.update(lineDataAt(prepared.dates, prepared.ema20, nextIndex));
    series.psar.update(psarDataAt(prepared.dates, prepared.psar, nextIndex));
    series.macdLine.update(lineDataAt(prepared.dates, prepared.macdLine, nextIndex));
    series.signalLine.update(lineDataAt(prepared.dates, prepared.signalLine, nextIndex));
    series.macdHistogram.update(histogramDataAt(prepared.dates, prepared.histogram, nextIndex));

    setRevealedIndex(nextIndex);
    setCurrentEfi(prepared.efiValues[nextIndex] ?? null);
  };

  const canRevealMore = revealedIndex !== null && revealedIndex < totalCandles - 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <button
          onClick={handleNextDay}
          disabled={!canRevealMore}
          className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
        >
          Next day
        </button>
      </div>
      <div className="relative w-full">
        <div ref={containerRef} className="w-full" />
        {currentEfi !== null && (
          <div
            className={`pointer-events-none absolute top-2 left-1/2 z-10 -translate-x-1/2 rounded-full px-3 py-1 text-xs font-semibold text-white ${
              currentEfi >= 0 ? "bg-[#26a69a]" : "bg-[#ef5350]"
            }`}
          >
            EFI {formatEfi(currentEfi)}
          </div>
        )}
      </div>
      <div ref={macdContainerRef} className="w-full" />
    </div>
  );
}
