import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
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
  const downloadUrl =
    image?.processedKey != null
      ? await getPresignedDownloadUrl(
          image.processedKey,
          3600,
          `${project.name}.jpg`,
        )
      : null;
  const cutoutUrl =
    image?.cutoutKey != null
      ? await getPresignedDownloadUrl(image.cutoutKey, 3600)
      : null;

  return (
    <>
      <Link
        href="/dashboard/galeria"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Vissza a galériához
      </Link>

      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
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
          downloadUrl={downloadUrl}
          cutoutUrl={cutoutUrl}
          projectName={project.name}
        />
      ) : (
        <div className="rounded-3xl border border-border/70 bg-white p-8 text-muted-foreground shadow-soft">
          Nincs kép a projekthez.
        </div>
      )}
    </>
  );
}
