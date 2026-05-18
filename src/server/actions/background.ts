"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import {
  downloadObject,
  getPresignedUploadUrl,
  uploadBuffer,
} from "@/lib/r2";
import { composeOnBackground } from "@/lib/composite";
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

/**
 * Recompose an image with a new background and persist:
 *  - Project.backgroundType (+ backgroundUrl for CUSTOM)
 *  - User.preferredBg / preferredBgKey (so future projects start with this)
 *  - Processed image is overwritten on the same R2 key.
 */
export async function changeBackground(
  imageId: string,
  bgType: BackgroundType,
  customKey: string | null,
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

  if (bgType === "CUSTOM" && !customKey) {
    throw new Error("CUSTOM háttérhez kötelező a kulcs.");
  }

  const cutoutBuf = await downloadObject(image.cutoutKey);
  const customBg =
    bgType === "CUSTOM" && customKey
      ? await downloadObject(customKey)
      : undefined;

  const composed = await composeOnBackground(cutoutBuf, bgType, {
    rotateDeg: image.rotateDeg,
    offsetXPct: image.offsetXPct,
    offsetYPct: image.offsetYPct,
    customBg,
  });

  await uploadBuffer(image.processedKey, composed, "image/jpeg");

  await prisma.$transaction([
    prisma.project.update({
      where: { id: image.projectId },
      data: {
        backgroundType: bgType,
        backgroundUrl: bgType === "CUSTOM" ? customKey : null,
      },
    }),
    prisma.user.update({
      where: { id: user.id },
      data: {
        preferredBg: bgType,
        preferredBgKey: bgType === "CUSTOM" ? customKey : null,
      },
    }),
  ]);

  revalidatePath(`/dashboard/projects/${image.projectId}`);
}
