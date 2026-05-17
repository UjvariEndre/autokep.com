"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { deleteObject } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";

export async function deleteProject(projectId: string): Promise<void> {
  const user = await getOrCreateUser();

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { images: true },
  });

  if (!project) throw new Error("A projekt nem található.");
  if (project.userId !== user.id) throw new Error("Nincs jogosultságod a törléshez.");

  const keys = project.images.flatMap((img) =>
    [img.originalKey, img.cutoutKey, img.processedKey].filter(
      (k): k is string => typeof k === "string" && k.length > 0,
    ),
  );

  await Promise.all(
    keys.map(async (key) => {
      try {
        await deleteObject(key);
      } catch {
        // best-effort: ha az R2 objektum nem törölhető, a DB rekordot mindenképp töröljük
      }
    }),
  );

  await prisma.project.delete({ where: { id: projectId } });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/galeria");
}
