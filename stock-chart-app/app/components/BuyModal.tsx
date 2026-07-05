"use client";

import { useState } from "react";
import type { Trade } from "./StockChart";

interface BuyModalProps {
  buyPrice: number;
  onConfirm: (trade: Omit<Trade, "buyDate">) => void;
  onClose: () => void;
}

type RiskMode = "percent" | "amount";
type TargetSource = "rr" | "manual";

function formatRupees(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function round(value: number, decimals: number): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

// Parses a field's raw text for calculations only — never fed back into that
// field's own `value` prop, so the text the user is actively typing (including
// an empty string mid-edit, a trailing ".", etc.) is never clobbered.
function parseNonNegative(text: string): number {
  const n = Number(text);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export default function BuyModal({ buyPrice, onConfirm, onClose }: BuyModalProps) {
  // Each editable number field keeps its own raw string state, updated
  // verbatim on every keystroke. Parsed numeric versions (used for all math
  // below) are derived separately and never written back into these.
  const [totalCapitalText, setTotalCapitalText] = useState("100000");
  const [buyPriceText, setBuyPriceText] = useState(() => String(round(buyPrice, 2)));
  const [slPriceText, setSlPriceText] = useState(() => String(round(buyPrice * 0.98, 2)));
  const [riskValueText, setRiskValueText] = useState("1");
  const [riskMode, setRiskMode] = useState<RiskMode>("percent");

  // Only one of these two is ever "authoritative" at a time — whichever field
  // the user typed into most recently. The other field's displayed value is
  // always freshly derived from it below, so they can never fight each other.
  const [rrText, setRrText] = useState("2");
  const [targetText, setTargetText] = useState(() => String(round(buyPrice * 1.04, 2)));
  const [targetSource, setTargetSource] = useState<TargetSource>("rr");

  const totalCapital = parseNonNegative(totalCapitalText);
  const buyPriceNum = parseNonNegative(buyPriceText);
  const slPriceNum = parseNonNegative(slPriceText);
  const riskValue = parseNonNegative(riskValueText);
  const rrMultiplier = parseNonNegative(rrText);
  const manualTargetPrice = parseNonNegative(targetText);

  const riskPerShare = buyPriceNum - slPriceNum;
  const riskAmount = riskMode === "percent" ? (riskValue / 100) * totalCapital : riskValue;
  const positionSize = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const capitalDeployed = positionSize * buyPriceNum;

  const targetPrice = targetSource === "rr" ? buyPriceNum + riskPerShare * rrMultiplier : manualTargetPrice;
  const displayedRr =
    targetSource === "rr" ? rrMultiplier : riskPerShare > 0 ? (targetPrice - buyPriceNum) / riskPerShare : 0;

  // What each of the two synced fields actually shows: the authoritative one
  // shows exactly what was typed; the other mirrors a live-computed value.
  const rrDisplayValue = targetSource === "rr" ? rrText : String(round(displayedRr, 2));
  const targetDisplayValue = targetSource === "manual" ? targetText : String(round(targetPrice, 2));

  const maxLoss = positionSize * riskPerShare;
  const maxGain = positionSize * (targetPrice - buyPriceNum);

  const isValid = slPriceNum < buyPriceNum && positionSize > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      buyPrice: buyPriceNum,
      slPrice: slPriceNum,
      targetPrice,
      positionSize,
      capitalDeployed,
      maxLoss,
      maxGain,
    });
  };

  const fieldInput =
    "w-32 rounded-lg border border-purple-100 bg-transparent px-2 py-1 text-right dark:border-white/10";
  const toggleGroup = "flex overflow-hidden rounded-lg border border-purple-100 dark:border-white/10";
  const toggleButton = (active: boolean) =>
    `px-2 py-1 text-xs transition-colors ${
      active
        ? "bg-purple-600 text-white"
        : "bg-transparent text-purple-700 hover:bg-purple-50 dark:text-purple-300 dark:hover:bg-purple-400/10"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#2a1f3d]/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-xl bg-white p-5 shadow-xl dark:bg-[#241d2e]"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-purple-950 dark:text-purple-50">Buy</h2>

        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span>Total Capital (₹)</span>
            <input
              type="number"
              min={0}
              value={totalCapitalText}
              onChange={(e) => setTotalCapitalText(e.target.value)}
              className={fieldInput}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Buy price (₹)</span>
            <input
              type="number"
              min={0}
              step="0.05"
              value={buyPriceText}
              onChange={(e) => setBuyPriceText(e.target.value)}
              className={fieldInput}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Stop-loss price (₹)</span>
            <input
              type="number"
              min={0}
              step="0.05"
              value={slPriceText}
              onChange={(e) => setSlPriceText(e.target.value)}
              className={fieldInput}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Risk amount</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step="0.1"
                value={riskValueText}
                onChange={(e) => setRiskValueText(e.target.value)}
                className="w-20 rounded-lg border border-purple-100 bg-transparent px-2 py-1 text-right dark:border-white/10"
              />
              <div className={toggleGroup}>
                <button
                  type="button"
                  onClick={() => setRiskMode("percent")}
                  className={toggleButton(riskMode === "percent")}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setRiskMode("amount")}
                  className={toggleButton(riskMode === "amount")}
                >
                  ₹
                </button>
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Risk : Reward (1 : X)</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={rrDisplayValue}
              onChange={(e) => {
                setTargetSource("rr");
                setRrText(e.target.value);
              }}
              className={fieldInput}
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Target price (₹)</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={targetDisplayValue}
              onChange={(e) => {
                setTargetSource("manual");
                setTargetText(e.target.value);
              }}
              className={fieldInput}
            />
          </label>

          <div className="flex items-center justify-between gap-3">
            <span>Shares</span>
            <span className="w-32 py-1 text-right font-medium">{positionSize}</span>
          </div>
        </div>

        <div className="flex flex-col gap-1 rounded-lg border border-purple-100 bg-purple-50/50 p-3 text-sm dark:border-white/10 dark:bg-white/5">
          <div className="flex justify-between">
            <span className="text-zinc-500">Capital deployed</span>
            <span>₹{formatRupees(capitalDeployed)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Max loss</span>
            <span className="text-[#ef5350]">₹{formatRupees(maxLoss)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Max potential gain</span>
            <span className="text-[#26a69a]">₹{formatRupees(maxGain)}</span>
          </div>
        </div>

        {!isValid && (
          <p className="text-xs text-[#ef5350]">
            Stop-loss price must be below the buy price, and the risk amount must result in at
            least 1 share.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-purple-200 bg-white px-4 py-2 text-sm font-medium text-purple-700 transition-colors hover:bg-purple-50 dark:border-purple-400/30 dark:bg-transparent dark:text-purple-300 dark:hover:bg-purple-400/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="rounded-full bg-purple-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-purple-700 disabled:cursor-not-allowed disabled:opacity-40 dark:bg-purple-500 dark:hover:bg-purple-400"
          >
            Confirm Buy
          </button>
        </div>
      </div>
    </div>
  );
}
