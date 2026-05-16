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

// alpha > SOLID = car body (used for anchoring the wheels at floorY)
// alpha > 0     = car body + drop shadow (used to extract the full visible region)
const SOLID_ALPHA_THRESHOLD = 200;
const VISIBLE_ALPHA_THRESHOLD = 0;

const bgCache = new Map<string, Buffer>();
async function loadBackground(file: string): Promise<Buffer> {
  const cached = bgCache.get(file);
  if (cached) return cached;
  const buf = await readFile(path.join(process.cwd(), "public", "images", file));
  bgCache.set(file, buf);
  return buf;
}

type Bbox = { x: number; y: number; w: number; h: number };

async function detectBboxes(
  buf: Buffer,
): Promise<{ solid: Bbox; visible: Bbox }> {
  const { data, info } = await sharp(buf)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;

  let sMinX = width, sMinY = height, sMaxX = -1, sMaxY = -1;
  let vMinX = width, vMinY = height, vMaxX = -1, vMaxY = -1;

  for (let y = 0; y < height; y++) {
    const rowBase = y * width * channels;
    for (let x = 0; x < width; x++) {
      const alpha = data[rowBase + x * channels + (channels - 1)];
      if (alpha > VISIBLE_ALPHA_THRESHOLD) {
        if (x < vMinX) vMinX = x;
        if (x > vMaxX) vMaxX = x;
        if (y < vMinY) vMinY = y;
        if (y > vMaxY) vMaxY = y;
        if (alpha > SOLID_ALPHA_THRESHOLD) {
          if (x < sMinX) sMinX = x;
          if (x > sMaxX) sMaxX = x;
          if (y < sMinY) sMinY = y;
          if (y > sMaxY) sMaxY = y;
        }
      }
    }
  }
  if (sMaxX < 0) {
    throw new Error("Üres cutout — nincs car alpha a PNG-ben.");
  }
  return {
    solid: { x: sMinX, y: sMinY, w: sMaxX - sMinX + 1, h: sMaxY - sMinY + 1 },
    visible: { x: vMinX, y: vMinY, w: vMaxX - vMinX + 1, h: vMaxY - vMinY + 1 },
  };
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

  // 2. Detect bboxes and extract just the visible region (car + shadow).
  // Extracting drops any transparent padding around the car so the scale we
  // apply next is based on visual content, not original PNG dimensions.
  const { solid, visible } = await detectBboxes(transparentPng);
  const carExtract = await sharp(transparentPng)
    .extract({
      left: visible.x,
      top: visible.y,
      width: visible.w,
      height: visible.h,
    })
    .toBuffer();

  // 3. Compute scale so the solid body fills cfg.carWidthScale of the canvas,
  // then clamp it so the extracted region still fits inside the canvas. If
  // the photo is very loosely cropped (or the car aspect is very different
  // from the canvas), this gracefully shrinks the car instead of crashing.
  const desiredScale = (canvasW * cfg.carWidthScale) / solid.w;
  const maxScale = Math.min(canvasW / visible.w, canvasH / visible.h);
  const scale = Math.min(desiredScale, maxScale);

  const scaledExtractW = Math.max(1, Math.round(visible.w * scale));
  const scaledExtractH = Math.max(1, Math.round(visible.h * scale));
  const scaledCar = await sharp(carExtract)
    .resize({ width: scaledExtractW, height: scaledExtractH })
    .toBuffer();

  // 4. Anchor: solid bbox center horizontally at canvas center, solid bbox
  // bottom (wheels line) at floorY. Coordinates are relative to the extracted
  // image, so we subtract the extract's origin first.
  const solidInExtractCenterX = solid.x - visible.x + solid.w / 2;
  const solidInExtractBottomY = solid.y - visible.y + solid.h;
  const scaledSolidCenterX = solidInExtractCenterX * scale;
  const scaledSolidBottomY = solidInExtractBottomY * scale;

  // Clamp offsets to keep the extract inside the canvas. Asymmetric shadows
  // can push the math off-center; clamping keeps Sharp happy at the cost of
  // a few pixels of off-center placement in those edge cases.
  const rawLeft = canvasW / 2 - scaledSolidCenterX;
  const rawTop = canvasH * cfg.floorY - scaledSolidBottomY;
  const insertLeft = Math.max(0, Math.min(canvasW - scaledExtractW, Math.round(rawLeft)));
  const insertTop = Math.max(0, Math.min(canvasH - scaledExtractH, Math.round(rawTop)));

  return sharp(backgroundCanvas)
    .composite([{ input: scaledCar, left: insertLeft, top: insertTop }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
