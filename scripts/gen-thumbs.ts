// Generates lightweight WebP thumbnails for the showroom presets so the
// BackgroundPicker grid doesn't download the multi-MB full-res originals.
// The full-res /public/images/<key> files are untouched and still used by
// composite.ts when a background is applied.
//
// Run after adding/replacing any showroom image:
//   npx tsx scripts/gen-thumbs.ts

import { mkdir, readFile, writeFile, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { SHOWROOM_PRESETS, showroomThumbPath } from "../src/lib/backgrounds";

const PUBLIC_DIR = path.join(process.cwd(), "public");
const THUMB_WIDTH = 320; // grid tiles render well under this even on 2x screens
const WEBP_QUALITY = 72;

async function main() {
  const thumbsDir = path.join(PUBLIC_DIR, "images", "thumbs");
  await mkdir(thumbsDir, { recursive: true });

  for (const { key } of SHOWROOM_PRESETS) {
    const srcPath = path.join(PUBLIC_DIR, "images", key);
    // showroomThumbPath returns a public URL (/images/thumbs/x.webp); map to disk.
    const outPath = path.join(PUBLIC_DIR, showroomThumbPath(key));

    try {
      const input = await readFile(srcPath);
      const out = await sharp(input)
        .resize({ width: THUMB_WIDTH, withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toBuffer();
      await writeFile(outPath, out);

      const src = await stat(srcPath);
      const kb = (n: number) => `${(n / 1024).toFixed(0)} KB`;
      console.log(
        `✓ ${key.padEnd(16)} ${kb(src.size).padStart(9)} → ${kb(out.length)}`,
      );
    } catch (err) {
      console.error(`✗ ${key}: ${err instanceof Error ? err.message : err}`);
      process.exitCode = 1;
    }
  }
}

void main();
