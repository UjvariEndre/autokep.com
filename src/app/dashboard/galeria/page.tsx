import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { ImageIcon, Plus, Sparkles } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { ProcessStatus } from "@/generated/prisma/enums";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<ProcessStatus, string> = {
  PENDING: "Várakozik",
  PROCESSING: "Feldolgozás",
  DONE: "Kész",
  FAILED: "Hibás",
};

const STATUS_CLASSES: Record<ProcessStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  DONE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  FAILED: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

export default async function GalleryPage() {
  const user = await getOrCreateUser();

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
            Galéria
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Az összes feldolgozott autós fotód egy helyen.
          </p>
        </div>
        <Link
          href="/dashboard/new"
          className={cn(buttonVariants({ size: "default" }), "hidden sm:inline-flex")}
        >
          <Plus className="size-4" />
          Új kép
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
              Még üres a galériád
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Tölts fel egy autós fotót, és másodpercek alatt megkapod a kész
              showroom verziót.
            </p>
            <Link
              href="/dashboard/new"
              className={cn(buttonVariants({ size: "lg" }), "mt-6")}
            >
              <Plus className="size-4" />
              Indítsd az elsőt
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map(({ project, status, thumbUrl }) => (
            <Link
              key={project.id}
              href={`/dashboard/projects/${project.id}`}
              className="group block focus:outline-none"
            >
              <article className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft transition-all duration-200 group-hover:-translate-y-1 group-hover:shadow-soft-lg group-focus:-translate-y-1 group-focus:shadow-soft-lg">
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
                    {STATUS_LABEL[status]}
                  </span>
                </div>
                <div className="px-5 py-4">
                  <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
                    {project.name}
                  </h3>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDistanceToNow(project.createdAt, {
                      addSuffix: true,
                      locale: hu,
                    })}
                  </p>
                </div>
              </article>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
