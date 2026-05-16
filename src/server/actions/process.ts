"use server";

import { prisma } from "@/lib/prisma";
import { downloadObject, uploadBuffer } from "@/lib/r2";
import { removeCarBackground } from "@/lib/removebg";
import { compositeOnStudioGrey } from "@/lib/composite";
import { getOrCreateUser } from "@/server/users";

function projectNameFromFilename(filename: string): string {
  const base = filename.split(/[\\/]/).pop() ?? filename;
  const noExt = base.replace(/\.[a-zA-Z0-9]{1,5}$/, "");
  return (noExt || "Projekt").slice(0, 80);
}

export async function processImage(
  originalKey: string,
  originalFilename: string,
): Promise<{ projectId: string }> {
  const user = await getOrCreateUser();
  if (user.creditsLeft <= 0) {
    throw new Error("Elfogytak a krediteid.");
  }

  const project = await prisma.project.create({
    data: {
      userId: user.id,
      name: projectNameFromFilename(originalFilename),
      backgroundType: "STUDIO_GREY",
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
    const cutout = await removeCarBackground(inputBuf, { size: "full" });
    const composed = await compositeOnStudioGrey(cutout);
    const processedKey = `processed/${user.id}/${image.id}.jpg`;
    await uploadBuffer(processedKey, composed, "image/jpeg");

    await prisma.$transaction([
      prisma.image.update({
        where: { id: image.id },
        data: { status: "DONE", processedKey },
      }),
      prisma.user.update({
        where: { id: user.id },
        data: { creditsLeft: { decrement: 1 } },
      }),
    ]);

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
