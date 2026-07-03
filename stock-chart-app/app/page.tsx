"use client";

import { useEffect, useState } from "react";
import StockChart from "./components/StockChart";

function randomTicker(tickers: string[]): string {
  return tickers[Math.floor(Math.random() * tickers.length)];
}

export default function Home() {
  const [tickers, setTickers] = useState<string[]>([]);
  const [ticker, setTicker] = useState<string | null>(null);

  useEffect(() => {
    fetch("/data/stock_universe.json")
      .then((res) => res.json())
      .then((list: string[]) => {
        setTickers(list);
        setTicker(randomTicker(list));
      });
  }, []);

  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-4 py-16 px-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
            {ticker ?? "Loading..."}
          </h1>
          <button
            onClick={() => setTicker(randomTicker(tickers))}
            disabled={tickers.length === 0}
            className="rounded-full bg-foreground px-4 py-2 text-sm font-medium text-background transition-colors hover:bg-[#383838] disabled:opacity-50 dark:hover:bg-[#ccc]"
          >
            Next stock
          </button>
        </div>
        {ticker && <StockChart key={ticker} ticker={ticker} />}
      </main>
    </div>
  );
}
