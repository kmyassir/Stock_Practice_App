"use client";

import type { MacdConfig } from "./StockChart";

interface MacdSettingsPanelProps {
  config: MacdConfig;
  onChange: (config: MacdConfig) => void;
}

type PeriodKey = "fastPeriod" | "slowPeriod" | "signalPeriod";

export default function MacdSettingsPanel({ config, onChange }: MacdSettingsPanelProps) {
  const update = (patch: Partial<MacdConfig>) => onChange({ ...config, ...patch });
  const updatePeriod = (key: PeriodKey, raw: string) => update({ [key]: Math.max(1, Number(raw) || 1) });

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 p-3 dark:border-white/15">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">Fast</span>
          <input
            type="number"
            min={1}
            value={config.fastPeriod}
            onChange={(e) => updatePeriod("fastPeriod", e.target.value)}
            className="w-16 rounded border border-black/10 bg-transparent px-1 py-0.5 dark:border-white/20"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">Slow</span>
          <input
            type="number"
            min={1}
            value={config.slowPeriod}
            onChange={(e) => updatePeriod("slowPeriod", e.target.value)}
            className="w-16 rounded border border-black/10 bg-transparent px-1 py-0.5 dark:border-white/20"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">Signal</span>
          <input
            type="number"
            min={1}
            value={config.signalPeriod}
            onChange={(e) => updatePeriod("signalPeriod", e.target.value)}
            className="w-16 rounded border border-black/10 bg-transparent px-1 py-0.5 dark:border-white/20"
          />
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">MACD line</span>
          <input
            type="color"
            value={config.macdColor}
            onChange={(e) => update({ macdColor: e.target.value })}
            className="h-6 w-10 cursor-pointer rounded border border-black/10 dark:border-white/20"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">Signal line</span>
          <input
            type="color"
            value={config.signalColor}
            onChange={(e) => update({ signalColor: e.target.value })}
            className="h-6 w-10 cursor-pointer rounded border border-black/10 dark:border-white/20"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">Histogram +</span>
          <input
            type="color"
            value={config.histogramPositiveColor}
            onChange={(e) => update({ histogramPositiveColor: e.target.value })}
            className="h-6 w-10 cursor-pointer rounded border border-black/10 dark:border-white/20"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-zinc-500">Histogram -</span>
          <input
            type="color"
            value={config.histogramNegativeColor}
            onChange={(e) => update({ histogramNegativeColor: e.target.value })}
            className="h-6 w-10 cursor-pointer rounded border border-black/10 dark:border-white/20"
          />
        </label>
      </div>
    </div>
  );
}
