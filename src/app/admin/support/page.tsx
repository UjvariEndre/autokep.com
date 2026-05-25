import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { hu, enUS } from "date-fns/locale";
import { ChevronRight, Inbox, MessageCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getI18n } from "@/i18n/locale";

export const dynamic = "force-dynamic";

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export default async function AdminSupportPage() {
  const { locale, dict } = await getI18n();
  const t = dict.admin;
  const dateLocale = locale === "hu" ? hu : enUS;

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
            {t.title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {fmt(t.summary, { threads: threads.length, unread: totalUnread })}
          </p>
        </div>
      </div>

      {threads.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex size-12 items-center justify-center rounded-full bg-accent text-brand">
            <Inbox className="size-5" />
          </div>
          <p className="text-sm font-medium text-foreground">
            {t.emptyTitle}
          </p>
          <p className="max-w-sm text-xs text-muted-foreground">
            {t.emptyBody}
          </p>
        </Card>
      ) : (
        <div className="space-y-2">
          {threads.map((thread) => {
            const last = thread.messages[0];
            const preview = last?.body ?? "";
            const isClosed = thread.status === "closed";
            const hasUnread = thread.unreadByAdmin > 0;
            return (
              <Link
                key={thread.id}
                href={`/admin/support/${thread.id}`}
                className={cn(
                  "group flex items-center justify-between gap-4 rounded-2xl border bg-card px-5 py-4 shadow-soft transition-all hover:-translate-y-0.5 hover:shadow-soft-lg",
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
                        {thread.user.email}
                      </p>
                      {hasUnread && (
                        <Badge className="bg-brand text-white">
                          {fmt(t.newBadge, { count: thread.unreadByAdmin })}
                        </Badge>
                      )}
                      {isClosed && (
                        <Badge variant="outline" className="text-muted-foreground">
                          {t.closed}
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 truncate text-xs text-muted-foreground">
                      {last?.author === "ADMIN" && (
                        <span className="font-medium">{t.youPrefix}</span>
                      )}
                      {preview || "—"}
                    </p>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
                  <span>
                    {formatDistanceToNow(thread.lastMessageAt, {
                      locale: dateLocale,
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
