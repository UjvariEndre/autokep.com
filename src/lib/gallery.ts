import type { ProcessStatus } from "@/generated/prisma/enums";

// 3 rows × 3 columns.
export const GALLERY_PAGE_SIZE = 9;

export type GalleryCard = {
  id: string;
  name: string;
  createdAt: string; // ISO
  status: ProcessStatus;
  thumbUrl: string | null;
};

export type GalleryPageData = {
  page: number;
  totalPages: number;
  total: number;
  cards: GalleryCard[];
};
