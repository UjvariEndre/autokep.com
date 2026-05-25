import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { hu, enUS } from "date-fns/locale";
import { ImageIcon, Plus, Sparkles, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";
import { buttonVariants } from "@/components/ui/button";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { cn } from "@/lib/utils";
import { getI18n } from "@/i18n/locale";
import type { ProcessStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const STATUS_CLASSES: Record<ProcessStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  DONE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  FAILED: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

export default async function GalleryPage() {
  const user = await getOrCreateUser();
  const { locale, dict } = await getI18n();
  const t = dict.gallery;
  const dateLocale = locale === "hu" ? hu : enUS;

  const projects = await prisma.project.findMany({
    where: { userId: user.id },
    include: {
      images: {
        orderBy: { createdAt: "asc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const cards = await Promise.all(
    projects.map(async (p) => {
      const img = p.images[0];
      const thumbUrl =
        img?.processedKey != null
          ? await getPresignedDownloadUrl(img.processedKey, 3600)
          : null;
      const status: ProcessStatus = img?.status ?? "PENDING";
      return { project: p, status, thumbUrl };
    }),
  );

  return (
    <>
      <div className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            {t.title}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.subtitle}
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className={cn(buttonVariants({ size: "default" }), "hidden sm:inline-flex")}
        >
          <Plus className="size-4" />
          {t.newImage}
        </Link>
      </div>

      {cards.length === 0 ? (
        <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-white p-12 text-center shadow-soft">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent/60 to-transparent"
          />
          <div className="relative mx-auto flex max-w-md flex-col items-center">
            <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-soft-lg">
              <Sparkles className="size-6" />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">
              {t.emptyTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.emptyBody}
            </p>
            <Link
              href="/dashboard/new"
              className={cn(buttonVariants({ size: "lg" }), "mt-6")}
            >
              <Plus className="size-4" />
              {t.startFirst}
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ project, status, thumbUrl }) => (
            <article
              key={project.id}
              className="group relative overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-soft-lg focus-within:-translate-y-1 focus-within:shadow-soft-lg"
            >
              <Link
                href={`/dashboard/projects/${project.id}`}
                className="block focus:outline-none"
              >
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-secondary to-accent/40">
                  {thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={thumbUrl}
                      alt={project.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                      {status === "PROCESSING" ? (
                        <span className="inline-block size-7 animate-spin rounded-full border-2 border-indigo-200 border-t-brand" />
                      ) : (
                        <ImageIcon className="size-8 opacity-40" />
                      )}
                    </div>
                  )}
                  <span
                    className={cn(
                      "absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                      STATUS_CLASSES[status],
                    )}
                  >
                    {t.status[status]}
                  </span>
                </div>
                <div className="px-5 py-4 pr-14">
                  <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(project.createdAt, {
                      addSuffix: true,
                      locale: dateLocale,
                    })}
                  </p>
                </div>
              </Link>

              <DeleteProjectDialog
                projectId={project.id}
                projectName={project.name}
                createdAt={project.createdAt}
                trigger={
                  <button
                    type="button"
                    aria-label={t.deleteAria}
                    className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-white/90 text-muted-foreground shadow-soft backdrop-blur transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                  >
                    <Trash2 className="size-4" />
                  </button>
                }
              />
            </article>
          ))}
        </div>
      )}
    </>
  );
}
