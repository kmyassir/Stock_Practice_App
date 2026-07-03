"use client";

import type { MacdConfig } from "./StockChart";

interface MacdSettingsPanelProps {
  config: MacdConfig;
  onChange: (config: MacdConfig) => void;
}

type PeriodKey = "fastPeriod" | "slowPeriod" | "signalPeriod";

const label = "text-xs font-semibold tracking-wide uppercase text-purple-400 dark:text-purple-300/70";
const numberInput =
  "w-16 rounded border border-purple-100 bg-transparent px-1 py-0.5 dark:border-white/10";
const colorInput = "h-6 w-10 cursor-pointer rounded border border-purple-100 dark:border-white/10";

export default function MacdSettingsPanel({ config, onChange }: MacdSettingsPanelProps) {
  const update = (patch: Partial<MacdConfig>) => onChange({ ...config, ...patch });
  const updatePeriod = (key: PeriodKey, raw: string) => update({ [key]: Math.max(1, Number(raw) || 1) });

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-purple-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#241d2e]">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className={label}>Fast</span>
          <input
            type="number"
            min={1}
            value={config.fastPeriod}
            onChange={(e) => updatePeriod("fastPeriod", e.target.value)}
            className={numberInput}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className={label}>Slow</span>
          <input
            type="number"
            min={1}
            value={config.slowPeriod}
            onChange={(e) => updatePeriod("slowPeriod", e.target.value)}
            className={numberInput}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className={label}>Signal</span>
          <input
            type="number"
            min={1}
            value={config.signalPeriod}
            onChange={(e) => updatePeriod("signalPeriod", e.target.value)}
            className={numberInput}
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className={label}>MACD line</span>
          <input
            type="color"
            value={config.macdColor}
            onChange={(e) => update({ macdColor: e.target.value })}
            className={colorInput}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className={label}>Signal line</span>
          <input
            type="color"
            value={config.signalColor}
            onChange={(e) => update({ signalColor: e.target.value })}
            className={colorInput}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className={label}>Histogram +</span>
          <input
            type="color"
            value={config.histogramPositiveColor}
            onChange={(e) => update({ histogramPositiveColor: e.target.value })}
            className={colorInput}
          />
        </label>
        <label className="flex items-center gap-2">
          <span className={label}>Histogram -</span>
          <input
            type="color"
            value={config.histogramNegativeColor}
            onChange={(e) => update({ histogramNegativeColor: e.target.value })}
            className={colorInput}
          />
        </label>
      </div>
    </div>
  );
}
