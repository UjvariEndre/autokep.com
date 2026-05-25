import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl, objectExists } from "@/lib/r2";
import {
  customBgThumbKey,
  DEFAULT_SHOWROOM_KEY,
  isShowroomKey,
  showroomPublicPath,
} from "@/lib/backgrounds";
import { getOrCreateUser } from "@/server/users";
import { getI18n } from "@/i18n/locale";
import { ProjectViewer } from "./viewer";

export const dynamic = "force-dynamic";

export default async function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await getOrCreateUser();
  const { dict } = await getI18n();
  const t = dict.project;

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

  // The user may have a custom background saved as preference even if this
  // project currently uses a showroom preset — surface it so the picker can
  // show a thumbnail to switch back to without re-uploading.
  const savedCustomKey =
    project.backgroundType === "CUSTOM" && project.backgroundUrl
      ? project.backgroundUrl
      : user.preferredBgKey;
  // Prefer the lightweight thumbnail for the picker tile; fall back to the
  // full-res key for backgrounds uploaded before thumbnails were generated.
  const savedCustomUrl = savedCustomKey
    ? await getPresignedDownloadUrl(
        (await objectExists(customBgThumbKey(savedCustomKey)))
          ? customBgThumbKey(savedCustomKey)
          : savedCustomKey,
        3600,
      )
    : null;

  const resolvedPresetKey = isShowroomKey(project.backgroundPresetKey)
    ? project.backgroundPresetKey
    : DEFAULT_SHOWROOM_KEY;
  const bgPreviewUrl =
    project.backgroundType === "CUSTOM" && project.backgroundUrl
      ? await getPresignedDownloadUrl(project.backgroundUrl, 3600)
      : showroomPublicPath(resolvedPresetKey);

  return (
    <>
      <Link
        href="/dashboard/galeria"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <h1 className="mb-8 text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {project.name}
      </h1>

      {image ? (
        <ProjectViewer
          projectId={project.id}
          projectName={project.name}
          projectCreatedAt={project.createdAt.toISOString()}
          backgroundType={project.backgroundType}
          currentPresetKey={resolvedPresetKey}
          savedCustomKey={savedCustomKey ?? null}
          savedCustomUrl={savedCustomUrl}
          bgPreviewUrl={bgPreviewUrl}
          imageId={image.id}
          status={image.status}
          errorMessage={image.errorMessage}
          initialRotate={image.rotateDeg}
          initialOffsetX={image.offsetXPct}
          initialOffsetY={image.offsetYPct}
          initialZoom={image.zoom}
          originalUrl={originalUrl}
          processedUrl={processedUrl}
          downloadUrl={downloadUrl}
          cutoutUrl={cutoutUrl}
        />
      ) : (
        <div className="rounded-3xl border border-border/70 bg-card p-8 text-muted-foreground shadow-soft">
          {t.noImage}
        </div>
      )}
    </>
  );
}
