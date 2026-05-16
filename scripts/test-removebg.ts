import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import { removeCarBackground, RemoveBgError } from "../src/lib/removebg";

loadEnv({ path: ".env.local" });

const INPUT = resolve("test-fixtures/sample-car.jpg");
const OUTPUT = resolve("test-fixtures/sample-car-processed.png");

async function main() {
  const inStat = await stat(INPUT);
  console.log(`[in]  ${INPUT}  (${inStat.size} B)`);

  const input = await readFile(INPUT);
  const t0 = Date.now();

  try {
    // size=preview keeps the test on the free tier (does not consume paid credits)
    const output = await removeCarBackground(input, { size: "preview" });
    const elapsed = Date.now() - t0;
    await writeFile(OUTPUT, output);
    const outStat = await stat(OUTPUT);
    console.log(`[out] ${OUTPUT} (${outStat.size} B) in ${elapsed} ms`);
    console.log("[ok]  remove.bg integration works");
  } catch (err) {
    if (err instanceof RemoveBgError) {
      console.error(`[fail] status=${err.status} code=${err.code} msg=${err.message}`);
      process.exit(2);
    }
    throw err;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
