const fs = require("fs");
const path = require("path");

const projectRoot = path.join(__dirname, "..");
const dataPipelineDir = path.join(projectRoot, "..", "data_pipeline");
const ohlcvSourceDir = path.join(dataPipelineDir, "ohlcv");

const publicDataDir = path.join(projectRoot, "public", "data");
const publicOhlcvDir = path.join(publicDataDir, "ohlcv");

fs.mkdirSync(publicOhlcvDir, { recursive: true });

fs.copyFileSync(
  path.join(dataPipelineDir, "stock_universe.json"),
  path.join(publicDataDir, "stock_universe.json")
);

const files = fs.readdirSync(ohlcvSourceDir).filter((name) => name.endsWith(".json"));
for (const file of files) {
  fs.copyFileSync(path.join(ohlcvSourceDir, file), path.join(publicOhlcvDir, file));
}

console.log(`prepare-data: copied stock_universe.json and ${files.length} OHLCV files to public/data/`);
