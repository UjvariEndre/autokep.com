import Link from "next/link";
import { UserButton } from "@clerk/nextjs";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { prisma } from "@/lib/prisma";
import { getPresignedDownloadUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  PENDING: "bg-zinc-200 text-zinc-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  DONE: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default async function DashboardPage() {
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
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-lg font-semibold tracking-tight text-primary">
            Autokep
          </Link>
          <div className="flex items-center gap-3">
            <span className="rounded-full bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-700">
              {user.creditsLeft} / 3 kredit
            </span>
            <UserButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-semibold tracking-tight">Projektek</h1>
          <Link href="/dashboard/new" className={cn(buttonVariants())}>
            + Új projekt
          </Link>
        </div>

        {cards.length === 0 ? (
          <Card className="py-12">
            <CardContent className="flex flex-col items-center gap-4 text-center">
              <p className="text-lg text-zinc-700">Még nincs projekted.</p>
              <Link href="/dashboard/new" className={cn(buttonVariants())}>
                Indítsd az elsőt
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cards.map(({ project, status, thumbUrl }) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group block focus:outline-none"
              >
                <Card className="overflow-hidden transition-all group-hover:ring-2 group-hover:ring-primary/40 group-focus:ring-2 group-focus:ring-primary/40">
                  <div className="aspect-[4/3] w-full bg-zinc-100">
                    {thumbUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={thumbUrl}
                        alt={project.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-zinc-400">
                        {status === "PROCESSING" ? (
                          <span className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-zinc-300 border-t-primary" />
                        ) : (
                          <span className="text-xs">Nincs előnézet</span>
                        )}
                      </div>
                    )}
                  </div>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between gap-2">
                      <span className="truncate">{project.name}</span>
                      <Badge className={STATUS_CLASSES[status]}>
                        {STATUS_LABEL[status]}
                      </Badge>
                    </CardTitle>
                    <span className="text-xs text-zinc-500">
                      {formatDistanceToNow(project.createdAt, {
                        addSuffix: true,
                        locale: hu,
                      })}
                    </span>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
