"use server";

import { prisma } from "@/lib/prisma";
import { downloadObject, uploadBuffer } from "@/lib/r2";
import { removeCarBackground } from "@/lib/removebg";
import { composeOnBackground } from "@/lib/composite";
import { getOrCreateUser } from "@/server/users";

function projectNameFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const noExt = base.replace(/\.[a-zA-Z0-9]{1,5}$/, "");
  return (noExt || "Projekt").slice(0, 80);
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
  if (!unlimited && user.creditsLeft <= 0) {
    throw new Error("Elfogytak a krediteid.");
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: projectNameFromFilename(originalFilename),
      backgroundType: "SHOWROOM",
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

    const composed = await composeOnBackground(cutout, "SHOWROOM");
    const processedKey = `processed/${user.id}/${image.id}.jpg`;
    await uploadBuffer(processedKey, composed, "image/jpeg");

    if (unlimited) {
      await prisma.image.update({
        where: { id: image.id },
        data: { status: "DONE", processedKey, cutoutKey },
      });
    } else {
      await prisma.$transaction([
        prisma.image.update({
          where: { id: image.id },
          data: { status: "DONE", processedKey, cutoutKey },
        }),
        prisma.user.update({
          where: { id: user.id },
          data: { creditsLeft: { decrement: 1 } },
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
