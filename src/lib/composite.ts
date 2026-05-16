import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const SHOWROOM_PATH = path.join(process.cwd(), "public", "images", "shr01.png");

let cachedBackground: Buffer | null = null;
async function getShowroomBackground(): Promise<Buffer> {
  if (cachedBackground) return cachedBackground;
  cachedBackground = await readFile(SHOWROOM_PATH);
  return cachedBackground;
}

export async function compositeOnShowroom(
  transparentPng: Buffer,
): Promise<Buffer> {
  const meta = await sharp(transparentPng).metadata();
  const width = meta.width;
  const height = meta.height;
  if (!width || !height) {
    throw new Error("A bemeneti PNG-ből nem olvasható ki a méret.");
  }

  const bgSrc = await getShowroomBackground();
  // Cover-fit the showroom into the car cutout's dimensions: centered, no padding,
  // crops the longer axis if aspect ratios differ. Keeps the car at full resolution.
  const backgroundCanvas = await sharp(bgSrc)
    .resize({ width, height, fit: "cover", position: "center" })
    .removeAlpha()
    .toBuffer();

  return sharp(backgroundCanvas)
    .composite([{ input: transparentPng }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
