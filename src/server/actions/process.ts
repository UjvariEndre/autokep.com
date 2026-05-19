"use server";

import { prisma } from "@/lib/prisma";
import { downloadObject, uploadBuffer } from "@/lib/r2";
import { removeCarBackground } from "@/lib/removebg";
import { composeOnBackground } from "@/lib/composite";
import { DEFAULT_SHOWROOM_KEY, isShowroomKey } from "@/lib/backgrounds";
import { getOrCreateUser } from "@/server/users";

function projectNameFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const noExt = base.replace(/\.[a-zA-Z0-9]{1,5}$/, "");
  return (noExt || "Kép").slice(0, 80);
}

function hasUnlimitedCredits(email: string): boolean {
  const raw = process.env.UNLIMITED_CREDIT_EMAILS ?? "";
  const list = raw
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

export async function processImage(
  originalKey: string,
  originalFilename: string,
): Promise<{ projectId: string }> {
  const user = await getOrCreateUser();
  const unlimited = hasUnlimitedCredits(user.email);
  if (!unlimited && user.subscriptionCredits <= 0 && user.topupCredits <= 0) {
    throw new Error("NO_CREDITS");
  }

  const initialBgType = user.preferredBg ?? "SHOWROOM";
  const initialBgKey =
    initialBgType === "CUSTOM" ? user.preferredBgKey : null;
  const initialPresetKey =
    initialBgType === "SHOWROOM"
      ? isShowroomKey(user.preferredBgPresetKey)
        ? user.preferredBgPresetKey
        : DEFAULT_SHOWROOM_KEY
      : null;

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: projectNameFromFilename(originalFilename),
      backgroundType: initialBgType,
      backgroundUrl: initialBgKey,
      backgroundPresetKey: initialPresetKey,
    },
  });

  const image = await prisma.image.create({
    data: {
      projectId: project.id,
      originalKey,
      status: "PROCESSING",
    },
  });

  try {
    const inputBuf = await downloadObject(originalKey);
    // size=auto: remove.bg returns the best resolution the account can pay for.
    // On the free tier this degrades to preview (max 0.25 MP / ~500x500).
    // Switch to "full" once we have paid HD credits — see CLAUDE.md "Known issues".
    const cutout = await removeCarBackground(inputBuf, { size: "auto" });

    // Persist the cutout so future edits don't need to re-call remove.bg.
    const cutoutKey = `cutouts/${user.id}/${image.id}.png`;
    await uploadBuffer(cutoutKey, cutout, "image/png");

    const customBg =
      initialBgType === "CUSTOM" && initialBgKey
        ? await downloadObject(initialBgKey)
        : undefined;
    const composed = await composeOnBackground(cutout, initialBgType, {
      customBg,
      presetKey: initialPresetKey,
    });
    const processedKey = `processed/${user.id}/${image.id}.jpg`;
    await uploadBuffer(processedKey, composed, "image/jpeg");

    if (unlimited) {
      await prisma.image.update({
        where: { id: image.id },
        data: { status: "DONE", processedKey, cutoutKey },
      });
    } else {
      // Priority: subscription credits first, top-up second.
      const creditUpdate =
        user.subscriptionCredits > 0
          ? { subscriptionCredits: { decrement: 1 } }
          : { topupCredits: { decrement: 1 } };

      await prisma.$transaction([
        prisma.image.update({
          where: { id: image.id },
          data: { status: "DONE", processedKey, cutoutKey },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: creditUpdate,
        }),
      ]);
    }

    return { projectId: project.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await prisma.image.update({
      where: { id: image.id },
      data: { status: "FAILED", errorMessage: message },
    });
    throw err;
  }
}
