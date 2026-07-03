"use client";

import { useEffect, useState } from "react";
import StockChart, {
  DEFAULT_MA_CONFIGS,
  DEFAULT_MACD_CONFIG,
  type MaConfig,
  type MacdConfig,
} from "./components/StockChart";

const MA_CONFIG_STORAGE_KEY = "stock-chart-ma-config";
const MACD_CONFIG_STORAGE_KEY = "stock-chart-macd-config";

function randomTicker(tickers: string[]): string {
  return tickers[Math.floor(Math.random() * tickers.length)];
}

function loadStoredMaConfigs(): MaConfig[] {
  try {
    const raw = localStorage.getItem(MA_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_MA_CONFIGS;
    const parsed = JSON.parse(raw);
    if (
      Array.isArray(parsed) &&
      parsed.length === DEFAULT_MA_CONFIGS.length &&
      parsed.every(
        (c) =>
          typeof c === "object" &&
          c !== null &&
          typeof c.id === "string" &&
          (c.type === "SMA" || c.type === "EMA") &&
          typeof c.period === "number" &&
          typeof c.color === "string" &&
          typeof c.visible === "boolean"
      )
    ) {
      return parsed as MaConfig[];
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_MA_CONFIGS;
}

function loadStoredMacdConfig(): MacdConfig {
  try {
    const raw = localStorage.getItem(MACD_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_MACD_CONFIG;
    const parsed = JSON.parse(raw);
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      typeof parsed.fastPeriod === "number" &&
      typeof parsed.slowPeriod === "number" &&
      typeof parsed.signalPeriod === "number" &&
      typeof parsed.macdColor === "string" &&
      typeof parsed.signalColor === "string" &&
      typeof parsed.histogramPositiveColor === "string" &&
      typeof parsed.histogramNegativeColor === "string"
    ) {
      return parsed as MacdConfig;
    }
  } catch {
    // fall through to defaults
  }
  return DEFAULT_MACD_CONFIG;
}

export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ticker, setTicker] = useState<string | null>(null);
  const [toolbarSlot, setToolbarSlot] = useState<HTMLDivElement | null>(null);
  // Lazy initializer so this only ever reads localStorage once, on this
  // instance's first render, rather than defaulting then patching in an
  // effect (localStorage is unavailable during the server render, so this
  // still safely falls back to the defaults there).
  const [maConfigs, setMaConfigs] = useState<MaConfig[]>(() =>
    typeof window === "undefined" ? DEFAULT_MA_CONFIGS : loadStoredMaConfigs()
  );
  const [macdConfig, setMacdConfig] = useState<MacdConfig>(() =>
    typeof window === "undefined" ? DEFAULT_MACD_CONFIG : loadStoredMacdConfig()
  );

  useEffect(() => {
    fetch("/data/stock_universe.json")
      .then((res) => res.json())
      .then((list: string[]) => {
        setTickers(list);
        setTicker(randomTicker(list));
      });
  }, []);

  useEffect(() => {
    localStorage.setItem(MA_CONFIG_STORAGE_KEY, JSON.stringify(maConfigs));
  }, [maConfigs]);

  useEffect(() => {
    localStorage.setItem(MACD_CONFIG_STORAGE_KEY, JSON.stringify(macdConfig));
  }, [macdConfig]);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-7xl flex-col gap-4 py-16 px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            {ticker ?? "Loading..."}
          </h1>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTicker(randomTicker(tickers))}
              disabled={tickers.length === 0}
              className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
            >
              Next stock
            </button>
            <div ref={setToolbarSlot} className="flex flex-wrap items-center gap-2" />
          </div>
        </div>
        {ticker && (
          <StockChart
            key={ticker}
            ticker={ticker}
            maConfigs={maConfigs}
            onMaConfigsChange={setMaConfigs}
            macdConfig={macdConfig}
            onMacdConfigChange={setMacdConfig}
            toolbarSlot={toolbarSlot}
          />
        )}
      </main>
    </div>
  );
}
