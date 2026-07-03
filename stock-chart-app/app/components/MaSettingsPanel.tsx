"use client";

import { Fragment } from "react";
import type { MaConfig } from "./StockChart";

interface MaSettingsPanelProps {
  configs: MaConfig[];
  onChange: (configs: MaConfig[]) => void;
}

export default function MaSettingsPanel({ configs, onChange }: MaSettingsPanelProps) {
  const updateConfig = (id: string, patch: Partial<MaConfig>) => {
    onChange(configs.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-purple-100 bg-white p-4 shadow-sm dark:border-white/5 dark:bg-[#241d2e]">
      <div className="grid grid-cols-[auto_auto_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
        <span className="text-xs font-semibold tracking-wide uppercase text-purple-400 dark:text-purple-300/70">
          Show
        </span>
        <span className="text-xs font-semibold tracking-wide uppercase text-purple-400 dark:text-purple-300/70">
          Type
        </span>
        <span className="text-xs font-semibold tracking-wide uppercase text-purple-400 dark:text-purple-300/70">
          Period
        </span>
        <span className="text-xs font-semibold tracking-wide uppercase text-purple-400 dark:text-purple-300/70">
          Color
        </span>
        {configs.map((config) => (
          <Fragment key={config.id}>
            <input
              type="checkbox"
              checked={config.visible}
              onChange={(e) => updateConfig(config.id, { visible: e.target.checked })}
              className="accent-purple-600"
            />
            <select
              value={config.type}
              onChange={(e) => updateConfig(config.id, { type: e.target.value as MaConfig["type"] })}
              className="rounded border border-purple-100 bg-transparent px-1 py-0.5 dark:border-white/10"
            >
              <option value="SMA">SMA</option>
              <option value="EMA">EMA</option>
            </select>
            <input
              type="number"
              min={1}
              value={config.period}
              onChange={(e) =>
                updateConfig(config.id, { period: Math.max(1, Number(e.target.value) || 1) })
              }
              className="w-16 rounded border border-purple-100 bg-transparent px-1 py-0.5 dark:border-white/10"
            />
            <input
              type="color"
              value={config.color}
              onChange={(e) => updateConfig(config.id, { color: e.target.value })}
              className="h-6 w-10 cursor-pointer rounded border border-purple-100 dark:border-white/10"
            />
          </Fragment>
        ))}
      </div>
    </div>
  );
}
