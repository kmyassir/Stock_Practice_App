import StockChart from "./components/StockChart";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex w-full max-w-3xl flex-col gap-4 py-16 px-4">
        <h1 className="text-xl font-semibold text-black dark:text-zinc-50">
          Stock Chart
        </h1>
        <StockChart />
      </main>
    </div>
  );
}
