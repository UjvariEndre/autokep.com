import Link from "next/link";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { GalleryClient } from "@/components/gallery-client";
import { cn } from "@/lib/utils";
import { getI18n } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function GalleryPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  // The shell only needs the dictionary, so it paints right away; the grid is
  // fetched client-side (skeleton first), and pages are cached + prefetched.
  const { dict } = await getI18n();
  const t = dict.gallery;
  const sp = await searchParams;
  const initialPage = Math.max(1, Number.parseInt(sp.page ?? "1", 10) || 1);

  return (
    <>
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{t.subtitle}</p>
        </div>
        <Link
          href="/dashboard/new"
          className={cn(buttonVariants({ size: "default" }), "hidden sm:inline-flex")}
        >
          <Plus className="size-4" />
          {t.newImage}
        </Link>
      </div>

      <GalleryClient initialPage={initialPage} />
    </>
  );
}
