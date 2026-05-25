"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { hu, enUS } from "date-fns/locale";
import { ChevronLeft, ChevronRight, ImageIcon, Plus, Sparkles, Trash2 } from "lucide-react";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadGalleryPage } from "@/server/actions/gallery";
import { GALLERY_PAGE_SIZE, type GalleryPageData } from "@/lib/gallery";
import { useI18n } from "@/i18n/provider";
import type { ProcessStatus } from "@/generated/prisma/enums";

const STATUS_CLASSES: Record<ProcessStatus, string> = {
  PENDING: "bg-zinc-100 text-zinc-700 ring-1 ring-zinc-200",
  PROCESSING: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-100",
  DONE: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100",
  FAILED: "bg-rose-50 text-rose-700 ring-1 ring-rose-100",
};

export function GalleryClient({ initialPage = 1 }: { initialPage?: number }) {
  const { locale, dict } = useI18n();
  const t = dict.gallery;
  const dateLocale = locale === "hu" ? hu : enUS;

  const [page, setPage] = useState(initialPage);
  const [data, setData] = useState<GalleryPageData | null>(null);
  const [loading, setLoading] = useState(true);

  // Visited pages are cached so revisiting is instant; `requested` guards
  // against out-of-order responses when paginating quickly.
  const cacheRef = useRef<Map<number, GalleryPageData>>(new Map());
  const requestedRef = useRef(initialPage);

  const fetchPage = useCallback(async (target: number, force = false) => {
    requestedRef.current = target;
    const cached = !force && cacheRef.current.get(target);
    if (cached) {
      setData(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await loadGalleryPage(target);
      cacheRef.current.set(res.page, res);
      if (requestedRef.current === target) {
        setData(res);
        setLoading(false);
      }
    } catch {
      if (requestedRef.current === target) setLoading(false);
    }
  }, []);

  // Initial load — shows the skeleton instantly, fills in when data arrives.
  useEffect(() => {
    void fetchPage(initialPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Prefetch the next page so forward navigation is instant.
  useEffect(() => {
    if (!data || loading) return;
    const next = page + 1;
    if (next <= data.totalPages && !cacheRef.current.has(next)) {
      loadGalleryPage(next)
        .then((res) => cacheRef.current.set(res.page, res))
        .catch(() => {});
    }
  }, [page, data, loading]);

  const goTo = useCallback(
    (next: number) => {
      if (next < 1 || next === page) return;
      setPage(next);
      void fetchPage(next);
    },
    [page, fetchPage],
  );

  const handleDeleted = useCallback(async () => {
    cacheRef.current.clear();
    setLoading(true);
    const res = await loadGalleryPage(page);
    // If the last item on this page was removed, fall back to the last page.
    if (res.total > 0 && page > res.totalPages) {
      setPage(res.totalPages);
      void fetchPage(res.totalPages, true);
      return;
    }
    cacheRef.current.set(res.page, res);
    setData(res);
    setLoading(false);
  }, [page, fetchPage]);

  if (loading || !data) {
    return <GallerySkeleton />;
  }

  if (data.total === 0) {
    return <EmptyState t={t} />;
  }

  return (
    <>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.cards.map((card) => (
          <article
            key={card.id}
            className="group relative overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft transition-all duration-200 hover:-translate-y-1 hover:shadow-soft-lg focus-within:-translate-y-1 focus-within:shadow-soft-lg"
          >
            <Link href={`/dashboard/projects/${card.id}`} className="block focus:outline-none">
              <div className="relative aspect-[4/3] w-full overflow-hidden bg-gradient-to-br from-secondary to-accent/40">
                {card.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={card.thumbUrl}
                    alt={card.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-muted-foreground">
                    {card.status === "PROCESSING" ? (
                      <span className="inline-block size-7 animate-spin rounded-full border-2 border-indigo-200 border-t-brand" />
                    ) : (
                      <ImageIcon className="size-8 opacity-40" />
                    )}
                  </div>
                )}
                <span
                  className={cn(
                    "absolute right-3 top-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium",
                    STATUS_CLASSES[card.status],
                  )}
                >
                  {t.status[card.status]}
                </span>
              </div>
              <div className="px-5 py-4 pr-14">
                <h3 className="truncate text-sm font-semibold tracking-tight text-foreground">
                  {card.name}
                </h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(card.createdAt), {
                    addSuffix: true,
                    locale: dateLocale,
                  })}
                </p>
              </div>
            </Link>

            <DeleteProjectDialog
              projectId={card.id}
              projectName={card.name}
              createdAt={card.createdAt}
              onDeleted={handleDeleted}
              trigger={
                <button
                  type="button"
                  aria-label={t.deleteAria}
                  className="absolute bottom-3 right-3 z-10 inline-flex size-9 items-center justify-center rounded-full border border-border/70 bg-card/90 text-muted-foreground shadow-soft backdrop-blur transition-colors hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-300"
                >
                  <Trash2 className="size-4" />
                </button>
              }
            />
          </article>
        ))}
      </div>

      <Pagination
        page={page}
        totalPages={data.totalPages}
        onGo={goTo}
        prevLabel={t.prevPage}
        nextLabel={t.nextPage}
      />
    </>
  );
}

function EmptyState({ t }: { t: ReturnType<typeof useI18n>["dict"]["gallery"] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl border border-border/70 bg-card p-12 text-center shadow-soft">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-accent/60 to-transparent"
      />
      <div className="relative mx-auto flex max-w-md flex-col items-center">
        <div className="mb-5 flex size-14 items-center justify-center rounded-2xl bg-brand text-white shadow-soft-lg">
          <Sparkles className="size-6" />
        </div>
        <h2 className="text-xl font-semibold tracking-tight text-foreground">{t.emptyTitle}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.emptyBody}</p>
        <Link href="/dashboard/new" className={cn(buttonVariants({ size: "lg" }), "mt-6")}>
          <Plus className="size-4" />
          {t.startFirst}
        </Link>
      </div>
    </div>
  );
}

function GallerySkeleton() {
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3" aria-hidden>
      {Array.from({ length: GALLERY_PAGE_SIZE }).map((_, i) => (
        <div
          key={i}
          className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft"
        >
          <div className="skeleton aspect-[4/3] w-full" />
          <div className="space-y-2 px-5 py-4">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

function buildPageList(current: number, total: number): (number | "ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const wanted = new Set([1, total, current, current - 1, current + 1]);
  const visible = [...wanted].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | "ellipsis")[] = [];
  let prev = 0;
  for (const p of visible) {
    if (p - prev > 1) out.push("ellipsis");
    out.push(p);
    prev = p;
  }
  return out;
}

function Pagination({
  page,
  totalPages,
  onGo,
  prevLabel,
  nextLabel,
}: {
  page: number;
  totalPages: number;
  onGo: (p: number) => void;
  prevLabel: string;
  nextLabel: string;
}) {
  if (totalPages <= 1) return null;
  const items = buildPageList(page, totalPages);
  const arrow =
    "inline-flex size-9 items-center justify-center rounded-lg border border-border/70 bg-card text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:pointer-events-none disabled:opacity-40";

  return (
    <nav className="mt-10 flex items-center justify-center gap-1.5">
      <button
        type="button"
        aria-label={prevLabel}
        disabled={page <= 1}
        onClick={() => onGo(page - 1)}
        className={arrow}
      >
        <ChevronLeft className="size-4" />
      </button>

      {items.map((it, i) =>
        it === "ellipsis" ? (
          <span key={`e${i}`} className="px-1.5 text-sm text-muted-foreground">
            …
          </span>
        ) : (
          <button
            key={it}
            type="button"
            aria-current={it === page ? "page" : undefined}
            onClick={() => onGo(it)}
            className={cn(
              "inline-flex size-9 items-center justify-center rounded-lg text-sm font-medium transition-colors",
              it === page
                ? "bg-brand text-white shadow-soft"
                : "border border-border/70 bg-card text-foreground hover:bg-secondary",
            )}
          >
            {it}
          </button>
        ),
      )}

      <button
        type="button"
        aria-label={nextLabel}
        disabled={page >= totalPages}
        onClick={() => onGo(page + 1)}
        className={arrow}
      >
        <ChevronRight className="size-4" />
      </button>
    </nav>
  );
}
