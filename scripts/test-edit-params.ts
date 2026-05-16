/**
 * Visual regression for the edit params pipeline. Runs the composeOnBackground
 * function with rotation + X/Y offset and saves the result for inspection.
 */
import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config as loadEnv } from "dotenv";

loadEnv({ path: ".env.local" });

import { composeOnBackground } from "../src/lib/composite";

async function main() {
  const cutout = await readFile(resolve("test-fixtures/sample-car-cutout.png"));

  // Default
  await writeFile(
    resolve("test-fixtures/edit-default.jpg"),
    await composeOnBackground(cutout, "SHOWROOM"),
  );
  console.log("[default] edit-default.jpg");

  // Rotation only
  await writeFile(
    resolve("test-fixtures/edit-rot3.jpg"),
    await composeOnBackground(cutout, "SHOWROOM", { rotateDeg: 3 }),
  );
  console.log("[+3°]     edit-rot3.jpg");

  // Offset right + down
  await writeFile(
    resolve("test-fixtures/edit-offsetX10-Y5.jpg"),
    await composeOnBackground(cutout, "SHOWROOM", {
      offsetXPct: 10,
      offsetYPct: 5,
    }),
  );
  console.log("[X+10 Y+5]  edit-offsetX10-Y5.jpg");

  // Combined
  await writeFile(
    resolve("test-fixtures/edit-combined.jpg"),
    await composeOnBackground(cutout, "SHOWROOM", {
      rotateDeg: -2,
      offsetXPct: -8,
      offsetYPct: -3,
    }),
  );
  console.log("[combined] edit-combined.jpg (rot=-2°, X=-8%, Y=-3%)");
}

main().catch((err) => {
  console.error("[fail]", err);
  process.exit(1);
});
