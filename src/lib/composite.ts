import sharp from "sharp";

const STUDIO_GREY = { r: 0xe5, g: 0xe5, b: 0xe5 };

export async function compositeOnStudioGrey(
  transparentPng: Buffer,
): Promise<Buffer> {
  const meta = await sharp(transparentPng).metadata();
  const width = meta.width;
  const height = meta.height;
  if (!width || !height) {
    throw new Error("A bemeneti PNG-ből nem olvasható ki a méret.");
  }

  return sharp({
    create: {
      width,
      height,
      channels: 3,
      background: STUDIO_GREY,
    },
  })
    .composite([{ input: transparentPng }])
    .jpeg({ quality: 90, mozjpeg: true })
    .toBuffer();
}
