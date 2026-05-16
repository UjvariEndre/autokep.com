/**
 * Stress test for the "Image to composite must have same dimensions or smaller"
 * bug: synthesizes a cutout PNG with lots of transparent padding around a small
 * solid body + soft shadow. The pre-fix composite would error here.
 */
import { writeFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";
import sharp from "sharp";

loadEnv({ path: ".env.local" });

import { composeOnBackground } from "../src/lib/composite";

async function main() {
  const W = 1000;
  const H = 600;
  // 200x150 solid body in the center, with a soft shadow extending below.
  // Lots of transparent padding around: car body = 20% of canvas width.
  const carBody = await sharp({
    create: { width: 200, height: 150, channels: 4, background: { r: 50, g: 100, b: 200, alpha: 1 } },
  })
    .png()
    .toBuffer();

  const shadow = await sharp({
    create: { width: 220, height: 30, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } },
  })
    .blur(8)
    .png()
    .toBuffer();

  const cutout = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([
      { input: shadow, left: Math.round((W - 220) / 2), top: Math.round((H - 150) / 2 + 145) },
      { input: carBody, left: Math.round((W - 200) / 2), top: Math.round((H - 150) / 2) },
    ])
    .png()
    .toBuffer();

  const cutoutPath = resolve("test-fixtures/stress-cutout.png");
  await writeFile(cutoutPath, cutout);
  const cutStat = await stat(cutoutPath);
  console.log(`[cutout]  ${cutoutPath} (${cutStat.size} B, ${W}x${H}, body 200x150)`);

  console.log("[compose] composeOnBackground(SHOWROOM) on padded cutout ...");
  const t0 = Date.now();
  const result = await composeOnBackground(cutout, "SHOWROOM");
  const dt = Date.now() - t0;
  const outPath = resolve("test-fixtures/stress-showroom.jpg");
  await writeFile(outPath, result);
  const outStat = await stat(outPath);
  console.log(`[out]     ${outPath} (${outStat.size} B) in ${dt} ms`);
  console.log("[ok]      no overflow, composite succeeded");
}

main().catch((err) => {
  console.error("[fail]", err);
  process.exit(1);
});
