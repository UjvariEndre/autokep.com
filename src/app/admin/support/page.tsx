import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { hu } from "date-fns/locale";
import { ChevronRight, Inbox, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminSupportPage() {
  const threads = await prisma.supportThread.findMany({
    orderBy: [
      { unreadByAdmin: "desc" },
      { lastMessageAt: "desc" },
    ],
    include: {
      user: { select: { email: true } },
      messages: {
        orderBy: { createdAt: "desc" },
        take: 1,
        select: { body: true, author: true },
      },
    },
    take: 100,
  });

  const totalUnread = threads.reduce((sum, t) => sum + t.unreadByAdmin, 0);

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Support beszélgetések
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {threads.length} beszélgetés · {totalUnread} olvasatlan
          </p>
        </div>
      </div>

      {threads.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent text-brand">
            <Inbox className="size-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            Még nincs egy beszélgetés sem.
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            Ha valaki ír a chatben, itt jelenik meg.
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((t) => {
            const last = t.messages[0];
            const preview = last?.body ?? "";
            const isClosed = t.status === "closed";
            const hasUnread = t.unreadByAdmin > 0;
            return (
              <Link
                key={t.id}
                href={`/admin/support/${t.id}`}
                className={cn(
                  "group flex items-center justify-between gap-4 rounded-2xl border bg-white px-5 py-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg",
                  hasUnread
                    ? "border-brand/40 ring-1 ring-brand/10"
                    : "border-border/70",
                )}
              >
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <div
                    className={cn(
                      "mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl",
                      hasUnread
                        ? "bg-brand text-white"
                        : "bg-accent text-brand",
                    )}
                  >
                    <MessageCircle className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">
                        {t.user.email}
                      </p>
                      {hasUnread && (
                        <Badge className="bg-brand text-white">
                          {t.unreadByAdmin} új
                        </Badge>
                      )}
                      {isClosed && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Lezárva
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {last?.author === "ADMIN" && (
                        <span className="font-medium">Te: </span>
                      )}
                      {preview || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(t.lastMessageAt, {
                      locale: hu,
                      addSuffix: true,
                    })}
                  </span>
                  <ChevronRight className="size-4 text-muted-foreground/60 transition-transform group-hover:translate-x-0.5" />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
