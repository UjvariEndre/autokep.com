"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import {
  downloadObject,
  getPresignedUploadUrl,
  uploadBuffer,
} from "@/lib/r2";
import { composeOnBackground } from "@/lib/composite";
import {
  customBgThumbKey,
  DEFAULT_SHOWROOM_KEY,
  isShowroomKey,
} from "@/lib/backgrounds";

// Width of the custom-background thumbnail shown in the BackgroundPicker grid.
// Matches scripts/gen-thumbs.ts so showroom and custom tiles look consistent.
const CUSTOM_BG_THUMB_WIDTH = 320;

/**
 * Generate and store a small WebP thumbnail for a custom background so the
 * picker grid doesn't load the multi-MB original. Best-effort: a failure here
 * must never break the actual background change, so callers ignore errors.
 */
async function storeCustomBgThumb(key: string, fullBg: Buffer): Promise<void> {
  const thumb = await sharp(fullBg)
    .resize({ width: CUSTOM_BG_THUMB_WIDTH, withoutEnlargement: true })
    .webp({ quality: 72 })
    .toBuffer();
  await uploadBuffer(customBgThumbKey(key), thumb, "image/webp");
}
import { getOrCreateUser } from "@/server/users";
import type { BackgroundType } from "@/generated/prisma/enums";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "bg";
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  return cleaned.slice(0, 80) || "bg";
}

/**
 * Presigned PUT URL for uploading a custom background to R2.
 * Returns the R2 key the client should remember after PUT.
 */
export async function getCustomBackgroundUploadUrl(
  filename: string,
  contentType: string,
): Promise<{ url: string; key: string }> {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error("Csak JPG, PNG vagy WebP háttérképet tölthetsz fel.");
  }
  const user = await getOrCreateUser();
  const safeName = sanitizeFilename(filename);
  const key = `backgrounds/${user.id}/${randomUUID()}-${safeName}`;
  const url = await getPresignedUploadUrl(key, contentType, 300);
  return { url, key };
}

export type ChangeBackgroundOpts = {
  presetKey?: string | null;
  customKey?: string | null;
};

/**
 * Recompose an image with a new background and persist:
 *  - Project.backgroundType, backgroundPresetKey, backgroundUrl
 *  - User.preferredBg* (so the next upload defaults to this choice)
 *  - Processed image is overwritten on the same R2 key.
 */
export async function changeBackground(
  imageId: string,
  bgType: BackgroundType,
  opts: ChangeBackgroundOpts = {},
): Promise<void> {
  const user = await getOrCreateUser();

  const image = await prisma.image.findUnique({
    where: { id: imageId },
    include: { project: true },
  });
  if (!image || image.project.userId !== user.id) {
    throw new Error("Nincs jogosultság ehhez a képhez.");
  }
  if (!image.cutoutKey || !image.processedKey) {
    throw new Error(
      "Ez a kép még nincs feldolgozva (hiányzik a cutout). Töltsd fel újra.",
    );
  }

  let resolvedPresetKey: string | null = null;
  let resolvedCustomKey: string | null = null;

  if (bgType === "CUSTOM") {
    if (!opts.customKey) throw new Error("CUSTOM háttérhez kötelező a kulcs.");
    resolvedCustomKey = opts.customKey;
  } else if (bgType === "SHOWROOM") {
    resolvedPresetKey = isShowroomKey(opts.presetKey)
      ? opts.presetKey
      : DEFAULT_SHOWROOM_KEY;
  } else {
    throw new Error(`Nem támogatott háttér típus: ${bgType}`);
  }

  const cutoutBuf = await downloadObject(image.cutoutKey);
  const customBg = resolvedCustomKey
    ? await downloadObject(resolvedCustomKey)
    : undefined;

  const composed = await composeOnBackground(cutoutBuf, bgType, {
    rotateDeg: image.rotateDeg,
    offsetXPct: image.offsetXPct,
    offsetYPct: image.offsetYPct,
    zoom: image.zoom,
    presetKey: resolvedPresetKey,
    customBg,
  });

  await uploadBuffer(image.processedKey, composed, "image/jpeg");

  // Best-effort picker thumbnail for the custom bg — never block the apply.
  if (resolvedCustomKey && customBg) {
    try {
      await storeCustomBgThumb(resolvedCustomKey, customBg);
    } catch (err) {
      console.error("Custom bg thumbnail generation failed:", err);
    }
  }

  await prisma.$transaction([
    prisma.project.update({
      where: { id: image.projectId },
      data: {
        backgroundType: bgType,
        backgroundUrl: resolvedCustomKey,
        backgroundPresetKey: resolvedPresetKey,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        preferredBg: bgType,
        // Keep the "other-mode" preference so e.g. switching to a showroom
        // doesn't forget the user's previously uploaded custom bg.
        preferredBgKey:
          resolvedCustomKey ?? user.preferredBgKey ?? null,
        preferredBgPresetKey:
          resolvedPresetKey ?? user.preferredBgPresetKey ?? null,
      },
    }),
  ]);

  revalidatePath(`/dashboard/projects/${image.projectId}`);
}
