/**
 * Manual rotation roundtrip test.
 *  - Loads the existing sample-car cutout.
 *  - Synthetically tilts it by +5° clockwise (simulates a slanted upload).
 *  - Calls composeOnBackground with rotateDeg=-5 (matches the slider value the
 *    user would pick to counter the tilt).
 *  - The result should look like the untilted baseline.
 */
import { readFile, writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";

loadEnv({ path: ".env.local" });

import { composeOnBackground } from "../src/lib/composite";

const CUTOUT = resolve("test-fixtures/sample-car-cutout.png");
const SYNTH_TILT = 5;

async function main() {
  const cutoutBuf = await readFile(CUTOUT);

  const tiltedCutout = await sharp(cutoutBuf)
    .rotate(SYNTH_TILT, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();
  console.log(`[tilt]   synth +${SYNTH_TILT}° clockwise`);

  // No rotation — baseline shows the natural composite of the untilted cutout.
  const base = await composeOnBackground(cutoutBuf, "SHOWROOM");
  await writeFile(resolve("test-fixtures/tilt-baseline.jpg"), base);
  console.log("[base]   composeOnBackground(SHOWROOM, 0°)");

  // User counter-rotates -5° via the slider to fix the +5° tilt.
  const corrected = await composeOnBackground(tiltedCutout, "SHOWROOM", {
    rotateDeg: -SYNTH_TILT,
  });
  await writeFile(resolve("test-fixtures/tilt-corrected.jpg"), corrected);
  const cs = await stat(resolve("test-fixtures/tilt-corrected.jpg"));
  console.log(`[fix]    composeOnBackground(SHOWROOM, ${-SYNTH_TILT}°) → ${cs.size} B`);

  console.log("[ok]     compare tilt-corrected.jpg ≈ tilt-baseline.jpg");
}

main().catch((err) => {
  console.error("[fail]", err);
  process.exit(1);
});
