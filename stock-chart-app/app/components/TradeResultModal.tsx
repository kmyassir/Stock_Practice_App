"use client";

import type { TradeResult } from "./StockChart";

interface TradeResultModalProps {
  result: TradeResult;
  onNextStock: () => void;
}

function formatRupees(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function formatSignedRupees(value: number): string {
  const sign = value >= 0 ? "+₹" : "-₹";
  return `${sign}${formatRupees(Math.abs(value))}`;
}

function formatSignedPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value.toFixed(2)}%`;
}

export default function TradeResultModal({ result, onNextStock }: TradeResultModalProps) {
  const isWin = result.outcome === "win";
  const isNeutral = result.outcome === "neutral";

  const headline = isNeutral ? "Ran out of data" : isWin ? "Target hit — Win" : "Stopped out — Loss";
  const headlineColor = isNeutral
    ? "text-zinc-500 dark:text-zinc-400"
    : isWin
      ? "text-[#26a69a]"
      : "text-[#ef5350]";
  const pnlColor = result.pnl >= 0 ? "text-[#26a69a]" : "text-[#ef5350]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1f3d]/40 p-4">
      <div className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-5 shadow-xl dark:bg-[#241d2e]">
        <h2 className={`text-lg font-semibold ${headlineColor}`}>{headline}</h2>

        <div className="flex flex-col gap-1 rounded-lg border border-purple-100 bg-purple-50/50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex justify-between">
            <span className="text-zinc-500">{isNeutral ? "Last price" : `${result.hitLabel} hit`}</span>
            <span>₹{formatRupees(result.hitPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Buy date</span>
            <span>{result.buyDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Sell date</span>
            <span>{result.sellDate}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Days held</span>
            <span>
              {result.daysHeld} day{result.daysHeld === 1 ? "" : "s"}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">{isNeutral ? "Unrealized P&L" : "Realized P&L"}</span>
            <span className={pnlColor}>{formatSignedRupees(result.pnl)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">P&L % of capital deployed</span>
            <span className={pnlColor}>{formatSignedPercent(result.pnlPercent)}</span>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onNextStock}
            className="rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 dark:border-purple-400/30 dark:bg-transparent dark:text-purple-300 dark:hover:bg-purple-400/10"
          >
            Next stock
          </button>
        </div>
      </div>
    </div>
  );
}
