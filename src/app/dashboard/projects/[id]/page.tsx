import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";
import { ProjectViewer } from "./viewer";

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
  const cutoutUrl =
    image?.cutoutKey != null
      ? await getPresignedDownloadUrl(image.cutoutKey, 3600)
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

        {image ? (
          <ProjectViewer
            imageId={image.id}
            status={image.status}
            errorMessage={image.errorMessage}
            initialRotate={image.rotateDeg}
            initialOffsetX={image.offsetXPct}
            initialOffsetY={image.offsetYPct}
            originalUrl={originalUrl}
            processedUrl={processedUrl}
            cutoutUrl={cutoutUrl}
            projectName={project.name}
          />
        ) : (
          <div className="rounded-2xl border border-zinc-200 bg-white p-6 text-zinc-500">
            Nincs kép a projekthez.
          </div>
        )}
      </main>
    </div>
  );
}
