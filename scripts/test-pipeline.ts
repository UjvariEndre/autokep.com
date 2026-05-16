import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { removeCarBackground } from "../src/lib/removebg";
import { composeOnBackground } from "../src/lib/composite";

const INPUT = resolve("test-fixtures/sample-car.jpg");
const CUTOUT = resolve("test-fixtures/sample-car-cutout.png");
const FINAL = resolve("test-fixtures/sample-car-showroom.jpg");

async function main() {
  const inStat = await stat(INPUT);
  console.log(`[in]      ${INPUT}  (${inStat.size} B)`);

  const inputBuf = await readFile(INPUT);

  console.log("[cutout]  remove.bg (size=preview, add_shadow=true, type=car) ...");
  const t0 = Date.now();
  // size=preview keeps this on the free tier — production uses size=full
  const cutout = await removeCarBackground(inputBuf, {
    size: "preview",
    addShadow: true,
  });
  const dtCutout = Date.now() - t0;
  await writeFile(CUTOUT, cutout);
  const cutoutStat = await stat(CUTOUT);
  console.log(`          ${CUTOUT} (${cutoutStat.size} B) in ${dtCutout} ms`);

  console.log("[compose] composeOnBackground(SHOWROOM) — alpha bbox anchor ...");
  const t1 = Date.now();
  const final = await composeOnBackground(cutout, "SHOWROOM");
  const dtCompose = Date.now() - t1;
  await writeFile(FINAL, final);
  const finalStat = await stat(FINAL);
  console.log(`          ${FINAL} (${finalStat.size} B) in ${dtCompose} ms`);

  console.log("[ok]      pipeline complete");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
