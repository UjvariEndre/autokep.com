import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { BackgroundType } from "@/generated/prisma/enums";

type Preset = {
  imageFile: string;
  // 0..1 fraction of canvas height where the car body's bottom (wheels line)
  // should sit. The drop shadow naturally extends below this point.
  floorY: number;
  // 0..1 fraction of canvas width that the car body should occupy.
  carWidthScale: number;
  // Optional: 0..1 fraction of background height to crop off the top before
  // cover-fit. Pushes the visible horizon up in the canvas, freeing more floor
  // area below for the car to sit further from the wall.
  cropTop?: number;
};

const PRESETS: Partial<Record<BackgroundType, Preset>> = {
  SHOWROOM: {
    imageFile: "shr02.png",
    floorY: 0.88,
    carWidthScale: 0.65,
    cropTop: 0.10,
  },
};

// Pixels with alpha above this are treated as solid car body; lower values are
// the drop shadow from remove.bg's add_shadow=true. Excluding the shadow from
// the bbox keeps the wheels anchored at floorY (not the shadow's bottom).
const SOLID_ALPHA_THRESHOLD = 200;

const bgCache = new Map<string, Buffer>();
async function loadBackground(file: string): Promise<Buffer> {
  const cached = bgCache.get(file);
  if (cached) return cached;
  const buf = await readFile(path.join(process.cwd(), "public", "images", file));
  bgCache.set(file, buf);
  return buf;
}

type Bbox = { x: number; y: number; w: number; h: number };

async function detectCarBbox(buf: Buffer): Promise<Bbox> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y++) {
    const rowBase = y * width * channels;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowBase + x * channels + (channels - 1)];
      if (alpha > SOLID_ALPHA_THRESHOLD) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < 0) {
    throw new Error("Üres cutout — nincs car alpha a PNG-ben.");
  }
  return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
}

export async function composeOnBackground(
  transparentPng: Buffer,
  preset: BackgroundType,
): Promise<Buffer> {
  const cfg = PRESETS[preset];
  if (!cfg) {
    throw new Error(`Nincs preset konfigurálva ehhez: ${preset}`);
  }

  const meta = await sharp(transparentPng).metadata();
  const canvasW = meta.width;
  const canvasH = meta.height;
  if (!canvasW || !canvasH) {
    throw new Error("A cutout PNG-ből nem olvasható méret.");
  }

  // 1. Background: optional top-crop (zoom in), then cover-fit, strip alpha.
  const bgSrc = await loadBackground(cfg.imageFile);
  let bgPipeline = sharp(bgSrc);
  if (cfg.cropTop && cfg.cropTop > 0) {
    const bgMeta = await sharp(bgSrc).metadata();
    if (bgMeta.width && bgMeta.height) {
      const cropPx = Math.round(bgMeta.height * cfg.cropTop);
      bgPipeline = sharp(bgSrc).extract({
        left: 0,
        top: cropPx,
        width: bgMeta.width,
        height: bgMeta.height - cropPx,
      });
    }
  }
  const backgroundCanvas = await bgPipeline
    .resize({ width: canvasW, height: canvasH, fit: "cover", position: "center" })
    .removeAlpha()
    .toBuffer();

  // 2. Detect car body bbox (excluding shadow) and compute scale factor so the
  // body occupies cfg.carWidthScale of the canvas width.
  const bbox = await detectCarBbox(transparentPng);
  const scale = (canvasW * cfg.carWidthScale) / bbox.w;
  const scaledCutoutW = Math.max(1, Math.round(canvasW * scale));
  const scaledCutoutH = Math.max(1, Math.round(canvasH * scale));
  const scaledCutout = await sharp(transparentPng)
    .resize({ width: scaledCutoutW, height: scaledCutoutH })
    .toBuffer();

  // 3. Anchor: bbox center horizontally at canvas center, bbox bottom at floorY.
  // Math runs on the un-rounded scale so left/top sub-pixel drift stays tiny.
  const scaledBboxCenterX = (bbox.x + bbox.w / 2) * scale;
  const scaledBboxBottomY = (bbox.y + bbox.h) * scale;
  const insertLeft = Math.round(canvasW / 2 - scaledBboxCenterX);
  const insertTop = Math.round(canvasH * cfg.floorY - scaledBboxBottomY);

  return sharp(backgroundCanvas)
    .composite([{ input: scaledCutout, left: insertLeft, top: insertTop }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
