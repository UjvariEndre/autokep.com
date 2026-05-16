import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateUser();

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      images: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!project || project.userId !== user.id) {
    notFound();
  }

  const image = project.images[0];
  const originalUrl = image
    ? await getPresignedDownloadUrl(image.originalKey, 3600)
    : null;
  const processedUrl =
    image?.processedKey != null
      ? await getPresignedDownloadUrl(image.processedKey, 3600)
      : null;

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link
            href="/dashboard"
            className="text-sm text-zinc-600 hover:text-zinc-900"
          >
            ← Vissza a projektekhez
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">
          {project.name}
        </h1>

        <div className="grid gap-6 md:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Eredeti
            </h2>
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {originalUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={originalUrl}
                  alt="Eredeti kép"
                  className="w-full object-contain"
                />
              ) : (
                <div className="flex h-64 items-center justify-center text-zinc-400">
                  Nincs eredeti kép
                </div>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-zinc-500">
              Eredmény
            </h2>
            {image?.status === "DONE" && processedUrl ? (
              <div className="flex flex-col gap-4">
                <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={processedUrl}
                    alt="Feldolgozott kép"
                    className="w-full object-contain"
                  />
                </div>
                <a
                  href={processedUrl}
                  download={`${project.name}.jpg`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={cn(buttonVariants())}
                >
                  Letöltés
                </a>
              </div>
            ) : image?.status === "PROCESSING" || image?.status === "PENDING" ? (
              <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-white">
                <span className="inline-block h-8 w-8 animate-spin rounded-full border-2 border-zinc-300 border-t-primary" />
                <span className="text-sm text-zinc-600">
                  Feldolgozás folyamatban...
                </span>
              </div>
            ) : image?.status === "FAILED" ? (
              <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-6 text-sm text-red-700">
                <p className="mb-2 font-medium">A feldolgozás nem sikerült.</p>
                {image.errorMessage && (
                  <p className="mb-3 text-red-600">{image.errorMessage}</p>
                )}
                <Link href="/dashboard/new" className="underline">
                  Új projektet indítok
                </Link>
              </div>
            ) : (
              <div className="flex h-64 items-center justify-center rounded-2xl border border-zinc-200 bg-white text-zinc-400">
                Nincs kép
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
