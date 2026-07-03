"use client";

import { useState } from "react";
import type { Trade } from "./StockChart";

interface BuyModalProps {
  buyPrice: number;
  onConfirm: (trade: Trade) => void;
  onClose: () => void;
}

type SlMode = "percent" | "rupees";

function formatRupees(value: number): string {
  return value.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

export default function BuyModal({ buyPrice, onConfirm, onClose }: BuyModalProps) {
  const [totalCapital, setTotalCapital] = useState(100000);
  const [slMode, setSlMode] = useState<SlMode>("percent");
  const [slValue, setSlValue] = useState(2);
  const [riskPercent, setRiskPercent] = useState(1);
  const [rrMultiplier, setRrMultiplier] = useState(2);

  const slDistance = slMode === "percent" ? buyPrice * (slValue / 100) : slValue;
  const slPrice = buyPrice - slDistance;
  const riskPerShare = buyPrice - slPrice;
  const riskAmount = (riskPercent / 100) * totalCapital;
  const positionSize = riskPerShare > 0 ? Math.floor(riskAmount / riskPerShare) : 0;
  const capitalDeployed = positionSize * buyPrice;
  const targetPrice = buyPrice + riskPerShare * rrMultiplier;
  const maxLoss = positionSize * riskPerShare;
  const maxGain = positionSize * (targetPrice - buyPrice);

  const isValid = riskPerShare > 0 && positionSize > 0 && totalCapital > 0;

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({ buyPrice, slPrice, targetPrice, positionSize, capitalDeployed, maxLoss, maxGain });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="flex w-full max-w-md flex-col gap-4 rounded-lg bg-white p-5 dark:bg-zinc-900"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-semibold text-black dark:text-zinc-50">Buy</h2>

        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center justify-between gap-3">
            <span>Total Capital (₹)</span>
            <input
              type="number"
              min={0}
              value={totalCapital}
              onChange={(e) => setTotalCapital(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 rounded border border-black/10 bg-transparent px-2 py-1 text-right dark:border-white/20"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Stop-Loss distance</span>
            <div className="flex items-center gap-1">
              <input
                type="number"
                min={0}
                step="0.1"
                value={slValue}
                onChange={(e) => setSlValue(Math.max(0, Number(e.target.value) || 0))}
                className="w-20 rounded border border-black/10 bg-transparent px-2 py-1 text-right dark:border-white/20"
              />
              <div className="flex overflow-hidden rounded border border-black/10 dark:border-white/20">
                <button
                  type="button"
                  onClick={() => setSlMode("percent")}
                  className={`px-2 py-1 text-xs ${
                    slMode === "percent" ? "bg-foreground text-background" : ""
                  }`}
                >
                  %
                </button>
                <button
                  type="button"
                  onClick={() => setSlMode("rupees")}
                  className={`px-2 py-1 text-xs ${
                    slMode === "rupees" ? "bg-foreground text-background" : ""
                  }`}
                >
                  ₹
                </button>
              </div>
            </div>
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Risk % of capital</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={riskPercent}
              onChange={(e) => setRiskPercent(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 rounded border border-black/10 bg-transparent px-2 py-1 text-right dark:border-white/20"
            />
          </label>

          <label className="flex items-center justify-between gap-3">
            <span>Risk : Reward (1 : X)</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={rrMultiplier}
              onChange={(e) => setRrMultiplier(Math.max(0, Number(e.target.value) || 0))}
              className="w-32 rounded border border-black/10 bg-transparent px-2 py-1 text-right dark:border-white/20"
            />
          </label>
        </div>

        <div className="flex flex-col gap-1 rounded border border-black/10 p-3 text-sm dark:border-white/15">
          <div className="flex justify-between">
            <span className="text-zinc-500">Buy price</span>
            <span>₹{formatRupees(buyPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">SL price</span>
            <span className="text-[#ef5350]">₹{formatRupees(slPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Target price</span>
            <span className="text-[#26a69a]">₹{formatRupees(targetPrice)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">Shares</span>
            <span>{positionSize}</span>
          </div>
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
            Stop-loss distance must be greater than zero and result in at least 1 share.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full border border-black/10 px-4 py-2 text-sm font-medium transition-colors hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!isValid}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Confirm Buy
          </button>
        </div>
      </div>
    </div>
  );
}
