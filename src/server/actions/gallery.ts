"use server";

import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";
import { GALLERY_PAGE_SIZE, type GalleryPageData } from "@/lib/gallery";
import type { ProcessStatus } from "@/generated/prisma/enums";

/** One page of the current user's gallery, with presigned thumbnail URLs. */
export async function loadGalleryPage(page: number): Promise<GalleryPageData> {
  const requested = Math.max(1, Math.floor(page) || 1);
  const user = await getOrCreateUser();

  const [total, projects] = await Promise.all([
    prisma.project.count({ where: { userId: user.id } }),
    prisma.project.findMany({
      where: { userId: user.id },
      include: { images: { orderBy: { createdAt: "asc" }, take: 1 } },
      orderBy: { createdAt: "desc" },
      skip: (requested - 1) * GALLERY_PAGE_SIZE,
      take: GALLERY_PAGE_SIZE,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / GALLERY_PAGE_SIZE));

  const cards = await Promise.all(
    projects.map(async (p) => {
      const img = p.images[0];
      const thumbUrl =
        img?.processedKey != null
          ? await getPresignedDownloadUrl(img.processedKey, 3600)
          : null;
      return {
        id: p.id,
        name: p.name,
        createdAt: p.createdAt.toISOString(),
        status: (img?.status ?? "PENDING") as ProcessStatus,
        thumbUrl,
      };
    }),
  );

  return { page: requested, totalPages, total, cards };
}
