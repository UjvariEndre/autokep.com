"use server";

import { prisma } from "@/lib/prisma";
import { downloadObject, uploadBuffer } from "@/lib/r2";
import { composeOnBackground } from "@/lib/composite";
import { getOrCreateUser } from "@/server/users";

export async function editImage(
  imageId: string,
  rotateDeg: number,
  offsetXPct: number,
  offsetYPct: number,
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
      "Ez a kép szerkesztéshez kell egy cutout — régi feldolgozás. Töltsd fel újra.",
    );
  }

  const safeRotate = Math.max(-15, Math.min(15, Number(rotateDeg) || 0));
  const safeX = Math.max(-50, Math.min(50, Number(offsetXPct) || 0));
  const safeY = Math.max(-50, Math.min(50, Number(offsetYPct) || 0));

  const cutoutBuf = await downloadObject(image.cutoutKey);
  const composed = await composeOnBackground(cutoutBuf, image.project.backgroundType, {
    rotateDeg: safeRotate,
    offsetXPct: safeX,
    offsetYPct: safeY,
  });

  // Overwrite the same R2 key so the downloaded file stays at a stable URL.
  await uploadBuffer(image.processedKey, composed, "image/jpeg");

  await prisma.image.update({
    where: { id: imageId },
    data: {
      rotateDeg: safeRotate,
      offsetXPct: safeX,
      offsetYPct: safeY,
    },
  });
}
