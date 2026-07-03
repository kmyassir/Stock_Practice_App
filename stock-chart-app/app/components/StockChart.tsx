"use client";

import { useRef, useState, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
  LineStyle,
  type CandlestickData,
  type LineData,
  type HistogramData,
  type WhitespaceData,
  type IChartApi,
  type ISeriesApi,
  type IPriceLine,
  type Time,
} from "lightweight-charts";
import { sma, ema, macd, parabolicSar, efi, type PsarPoint } from "../lib/indicators";
import MaSettingsPanel from "./MaSettingsPanel";
import MacdSettingsPanel from "./MacdSettingsPanel";
import BuyModal from "./BuyModal";

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
  maConfigs: MaConfig[];
  onMaConfigsChange: (configs: MaConfig[]) => void;
  macdConfig: MacdConfig;
  onMacdConfigChange: (config: MacdConfig) => void;
  toolbarSlot: HTMLElement | null;
}

interface PreparedData {
  dates: string[];
  closes: number[];
  candles: CandlestickData<Time>[];
  psar: PsarPoint[];
  efiValues: (number | null)[];
}

interface MacdValues {
  macdLine: (number | null)[];
  signalLine: (number | null)[];
  histogram: (number | null)[];
}

interface SeriesHandles {
  candlestick: ISeriesApi<"Candlestick">;
  psar: ISeriesApi<"Line">;
  macdLine: ISeriesApi<"Line">;
  signalLine: ISeriesApi<"Line">;
  macdHistogram: ISeriesApi<"Histogram">;
}

export interface MaConfig {
  id: string;
  type: "SMA" | "EMA";
  period: number;
  color: string;
  visible: boolean;
}

export const DEFAULT_MA_CONFIGS: MaConfig[] = [
  { id: "ma-1", type: "EMA", period: 9, color: "#e91e63", visible: true },
  { id: "ma-2", type: "EMA", period: 20, color: "#ff9800", visible: true },
  { id: "ma-3", type: "SMA", period: 50, color: "#2196f3", visible: true },
  { id: "ma-4", type: "SMA", period: 150, color: "#9c27b0", visible: true },
  { id: "ma-5", type: "SMA", period: 200, color: "#607d8b", visible: true },
];

export interface MacdConfig {
  fastPeriod: number;
  slowPeriod: number;
  signalPeriod: number;
  macdColor: string;
  signalColor: string;
  histogramPositiveColor: string;
  histogramNegativeColor: string;
}

export const DEFAULT_MACD_CONFIG: MacdConfig = {
  fastPeriod: 12,
  slowPeriod: 26,
  signalPeriod: 9,
  macdColor: "#2196f3",
  signalColor: "#ff9800",
  histogramPositiveColor: "#26a69a",
  histogramNegativeColor: "#ef5350",
};

export interface Trade {
  buyPrice: number;
  slPrice: number;
  targetPrice: number;
  positionSize: number;
  capitalDeployed: number;
  maxLoss: number;
  maxGain: number;
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

  return {
    dates: raw.dates,
    closes: raw.close,
    candles,
    psar: parabolicSar(raw.high, raw.low),
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
  i: number,
  positiveColor: string,
  negativeColor: string
): HistogramData<Time> | WhitespaceData<Time> {
  const value = values[i];
  const time = dates[i] as Time;
  if (value === null) return { time };
  return { time, value, color: value >= 0 ? positiveColor : negativeColor };
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

// Module-level (not a closure) so it never goes stale and never needs to be
// listed in a hook's dependency array — every value it needs is passed in.
function rebuildMaSeries(
  chart: IChartApi,
  prepared: PreparedData,
  windowStart: number,
  upToIndex: number,
  configs: MaConfig[],
  seriesMap: Map<string, ISeriesApi<"Line">>,
  valuesMap: Record<string, (number | null)[]>
) {
  const visibleIds = new Set(configs.filter((c) => c.visible).map((c) => c.id));

  for (const [id, series] of seriesMap) {
    if (!visibleIds.has(id)) {
      chart.removeSeries(series);
      seriesMap.delete(id);
    }
  }

  for (const config of configs) {
    if (!config.visible) continue;

    const values = config.type === "SMA" ? sma(prepared.closes, config.period) : ema(prepared.closes, config.period);
    valuesMap[config.id] = values;

    let series = seriesMap.get(config.id);
    if (!series) {
      series = chart.addSeries(LineSeries, { color: config.color, lineWidth: 1 });
      seriesMap.set(config.id, series);
    } else {
      series.applyOptions({ color: config.color });
    }

    const points: (LineData<Time> | WhitespaceData<Time>)[] = [];
    for (let i = windowStart; i <= upToIndex; i++) {
      points.push(lineDataAt(prepared.dates, values, i));
    }
    series.setData(points);
  }
}

// Same rationale as rebuildMaSeries: a module-level function so it never
// needs to be a hook dependency and can be called from both the ticker-load
// effect and the macdConfig-change effect without going stale.
function rebuildMacd(
  prepared: PreparedData,
  windowStart: number,
  upToIndex: number,
  config: MacdConfig,
  series: { macdLine: ISeriesApi<"Line">; signalLine: ISeriesApi<"Line">; macdHistogram: ISeriesApi<"Histogram"> },
  valuesRef: { current: MacdValues }
) {
  const { macdLine, signalLine, histogram } = macd(
    prepared.closes,
    config.fastPeriod,
    config.slowPeriod,
    config.signalPeriod
  );
  valuesRef.current = { macdLine, signalLine, histogram };

  series.macdLine.applyOptions({ color: config.macdColor });
  series.signalLine.applyOptions({ color: config.signalColor });

  const linePoints = (values: (number | null)[]): (LineData<Time> | WhitespaceData<Time>)[] => {
    const points: (LineData<Time> | WhitespaceData<Time>)[] = [];
    for (let i = windowStart; i <= upToIndex; i++) {
      points.push(lineDataAt(prepared.dates, values, i));
    }
    return points;
  };

  const histogramPoints: (HistogramData<Time> | WhitespaceData<Time>)[] = [];
  for (let i = windowStart; i <= upToIndex; i++) {
    histogramPoints.push(
      histogramDataAt(prepared.dates, histogram, i, config.histogramPositiveColor, config.histogramNegativeColor)
    );
  }

  series.macdLine.setData(linePoints(macdLine));
  series.signalLine.setData(linePoints(signalLine));
  series.macdHistogram.setData(histogramPoints);
}

export default function StockChart({
  ticker,
  maConfigs,
  onMaConfigsChange,
  macdConfig,
  onMacdConfigChange,
  toolbarSlot,
}: StockChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const macdContainerRef = useRef<HTMLDivElement>(null);

  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<SeriesHandles | null>(null);
  const dataRef = useRef<PreparedData | null>(null);
  const windowStartRef = useRef(0);

  const maSeriesRef = useRef<Map<string, ISeriesApi<"Line">>>(new Map());
  const maValuesRef = useRef<Record<string, (number | null)[]>>({});
  const macdValuesRef = useRef<MacdValues>({ macdLine: [], signalLine: [], histogram: [] });
  const priceLinesRef = useRef<{ buy: IPriceLine; sl: IPriceLine; target: IPriceLine } | null>(null);

  const [revealedIndex, setRevealedIndex] = useState<number | null>(null);
  const [totalCandles, setTotalCandles] = useState(0);
  const [currentEfi, setCurrentEfi] = useState<number | null>(null);
  const [maSettingsOpen, setMaSettingsOpen] = useState(false);
  const [macdSettingsOpen, setMacdSettingsOpen] = useState(false);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [modalBuyPrice, setModalBuyPrice] = useState<number | null>(null);
  const [trade, setTrade] = useState<Trade | null>(null);

  // Ref mirrors of state so imperative code (effects/handlers) can read the
  // latest value without forcing unrelated effects to re-run on every change.
  const revealedIndexRef = useRef<number | null>(null);
  useEffect(() => {
    revealedIndexRef.current = revealedIndex;
  });
  const maConfigsRef = useRef(maConfigs);
  useEffect(() => {
    maConfigsRef.current = maConfigs;
  });
  const macdConfigRef = useRef(macdConfig);
  useEffect(() => {
    macdConfigRef.current = macdConfig;
  });

  useEffect(() => {
    if (!containerRef.current || !macdContainerRef.current) return;

    // React Strict Mode runs this effect, cleans it up, then runs it again on
    // mount. Without this guard, the first run's fetch can resolve after its
    // own cleanup already disposed `chart`, and its stale .then() callback
    // would then add/remove series on a dead chart and corrupt the shared
    // refs the second (real) run is using.
    let cancelled = false;

    const chart = createChart(containerRef.current, {
      autoSize: true,
    });
    chartRef.current = chart;
    const candlestick = chart.addSeries(CandlestickSeries);
    const psarSeries = chart.addSeries(LineSeries, {
      lineVisible: false,
      pointMarkersVisible: true,
      pointMarkersRadius: 2,
      lastValueVisible: false,
      priceLineVisible: false,
    });

    const macdChart = createChart(macdContainerRef.current, {
      autoSize: true,
    });
    const macdLineSeries = macdChart.addSeries(LineSeries, { color: "blue", lineWidth: 1 });
    const signalLineSeries = macdChart.addSeries(LineSeries, { color: "orange", lineWidth: 1 });
    const macdHistogramSeries = macdChart.addSeries(HistogramSeries, {});

    syncTimeScales([chart, macdChart]);

    const maSeriesMap = maSeriesRef.current;

    seriesRef.current = {
      candlestick,
      psar: psarSeries,
      macdLine: macdLineSeries,
      signalLine: signalLineSeries,
      macdHistogram: macdHistogramSeries,
    };

    fetch(`/data/ohlcv/${ticker}.json`)
      .then((res) => res.json())
      .then((raw: OhlcvPayload) => {
        if (cancelled) return;

        const prepared = prepareData(raw);
        dataRef.current = prepared;

        const n = prepared.candles.length;
        const startIndex = pickStartIndex(n);
        const windowStart = Math.max(0, startIndex - 30);
        windowStartRef.current = windowStart;

        const psarSlice: LineData<Time>[] = [];
        for (let i = windowStart; i <= startIndex; i++) {
          psarSlice.push(psarDataAt(prepared.dates, prepared.psar, i));
        }

        candlestick.setData(prepared.candles.slice(windowStart, startIndex + 1));
        psarSeries.setData(psarSlice);

        rebuildMaSeries(
          chart,
          prepared,
          windowStart,
          startIndex,
          maConfigsRef.current,
          maSeriesMap,
          maValuesRef.current
        );

        rebuildMacd(
          prepared,
          windowStart,
          startIndex,
          macdConfigRef.current,
          { macdLine: macdLineSeries, signalLine: signalLineSeries, macdHistogram: macdHistogramSeries },
          macdValuesRef
        );

        chart.timeScale().fitContent();
        macdChart.timeScale().fitContent();

        setTotalCandles(n);
        setRevealedIndex(startIndex);
        setCurrentEfi(prepared.efiValues[startIndex] ?? null);
      });

    return () => {
      cancelled = true;
      chart.remove();
      macdChart.remove();
      chartRef.current = null;
      seriesRef.current = null;
      dataRef.current = null;
      maSeriesMap.clear();
      maValuesRef.current = {};
      macdValuesRef.current = { macdLine: [], signalLine: [], histogram: [] };
      priceLinesRef.current = null;
    };
  }, [ticker]);

  // Rebuild MA series whenever the configuration changes (type/period/color/
  // visibility), replaying the currently revealed window rather than resetting
  // it back to the initial reveal point.
  useEffect(() => {
    const chart = chartRef.current;
    const prepared = dataRef.current;
    if (!chart || !prepared || revealedIndexRef.current === null) return;

    rebuildMaSeries(
      chart,
      prepared,
      windowStartRef.current,
      revealedIndexRef.current,
      maConfigs,
      maSeriesRef.current,
      maValuesRef.current
    );
  }, [maConfigs]);

  // Rebuild MACD whenever its configuration changes (periods/colors), same
  // replay-current-window rationale as the MA effect above.
  useEffect(() => {
    const series = seriesRef.current;
    const prepared = dataRef.current;
    if (!series || !prepared || revealedIndexRef.current === null) return;

    rebuildMacd(
      prepared,
      windowStartRef.current,
      revealedIndexRef.current,
      macdConfig,
      { macdLine: series.macdLine, signalLine: series.signalLine, macdHistogram: series.macdHistogram },
      macdValuesRef
    );
  }, [macdConfig]);

  const handleNextDay = () => {
    const series = seriesRef.current;
    const prepared = dataRef.current;
    if (!series || !prepared || revealedIndex === null) return;

    const nextIndex = revealedIndex + 1;
    if (nextIndex >= prepared.candles.length) return;

    const macdValues = macdValuesRef.current;

    series.candlestick.update(prepared.candles[nextIndex]);
    series.psar.update(psarDataAt(prepared.dates, prepared.psar, nextIndex));
    series.macdLine.update(lineDataAt(prepared.dates, macdValues.macdLine, nextIndex));
    series.signalLine.update(lineDataAt(prepared.dates, macdValues.signalLine, nextIndex));
    series.macdHistogram.update(
      histogramDataAt(
        prepared.dates,
        macdValues.histogram,
        nextIndex,
        macdConfig.histogramPositiveColor,
        macdConfig.histogramNegativeColor
      )
    );

    maSeriesRef.current.forEach((maSeries, id) => {
      const values = maValuesRef.current[id];
      if (values) maSeries.update(lineDataAt(prepared.dates, values, nextIndex));
    });

    setRevealedIndex(nextIndex);
    setCurrentEfi(prepared.efiValues[nextIndex] ?? null);
  };

  const handleOpenBuyModal = () => {
    const prepared = dataRef.current;
    if (!prepared || revealedIndex === null) return;
    setModalBuyPrice(prepared.candles[revealedIndex].close);
    setBuyModalOpen(true);
  };

  const handleConfirmBuy = (newTrade: Trade) => {
    const series = seriesRef.current;
    if (!series) return;

    const buy = series.candlestick.createPriceLine({
      price: newTrade.buyPrice,
      color: "#607d8b",
      lineWidth: 2,
      lineStyle: LineStyle.Solid,
      title: "Buy",
    });
    const sl = series.candlestick.createPriceLine({
      price: newTrade.slPrice,
      color: "#ef5350",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "SL",
    });
    const target = series.candlestick.createPriceLine({
      price: newTrade.targetPrice,
      color: "#26a69a",
      lineWidth: 2,
      lineStyle: LineStyle.Dashed,
      title: "Target",
    });

    priceLinesRef.current = { buy, sl, target };
    setTrade(newTrade);
    setBuyModalOpen(false);
  };

  const canRevealMore = revealedIndex !== null && revealedIndex < totalCandles - 1;
  const canBuy = trade === null && revealedIndex !== null;

  return (
    <div className="flex flex-col gap-2">
      {toolbarSlot &&
        createPortal(
          <>
            <button
              onClick={() => setMaSettingsOpen((open) => !open)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              MA settings
            </button>
            <button
              onClick={() => setMacdSettingsOpen((open) => !open)}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
            >
              MACD settings
            </button>
            <button
              onClick={handleOpenBuyModal}
              disabled={!canBuy}
              className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 disabled:opacity-50 dark:border-white/20 dark:hover:bg-white/10"
            >
              Buy
            </button>
            <button
              onClick={handleNextDay}
              disabled={!canRevealMore}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              Next day
            </button>
          </>,
          toolbarSlot
        )}
      {maSettingsOpen && <MaSettingsPanel configs={maConfigs} onChange={onMaConfigsChange} />}
      {macdSettingsOpen && <MacdSettingsPanel config={macdConfig} onChange={onMacdConfigChange} />}
      {buyModalOpen &&
        modalBuyPrice !== null &&
        createPortal(
          <BuyModal buyPrice={modalBuyPrice} onConfirm={handleConfirmBuy} onClose={() => setBuyModalOpen(false)} />,
          document.body
        )}
      <div className="relative w-full h-[600px]">
        <div ref={containerRef} className="h-full w-full" />
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
      <div ref={macdContainerRef} className="h-[180px] w-full" />
    </div>
  );
}
