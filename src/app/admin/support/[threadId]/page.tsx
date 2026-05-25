import Link from "next/link";
import { notFound } from "next/navigation";
import { format, isToday } from "date-fns";
import { hu, enUS } from "date-fns/locale";
import { ArrowLeft, Coins, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import { getI18n } from "@/i18n/locale";
import type { Locale } from "@/i18n/config";
import {
  adminCloseThread,
  adminMarkThreadRead,
  adminReopenThread,
} from "@/server/actions/support";
import { ReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function formatTime(d: Date, locale: Locale): string {
  if (isToday(d)) return format(d, "HH:mm");
  return format(d, locale === "hu" ? "yyyy. MMM d. HH:mm" : "MMM d, yyyy HH:mm", {
    locale: locale === "hu" ? hu : enUS,
  });
}

export default async function AdminThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
  const { locale, dict } = await getI18n();
  const t = dict.admin;
  const thread = await prisma.supportThread.findUnique({
    where: { id: threadId },
    include: {
      user: {
        select: {
          email: true,
          subscriptionCredits: true,
          topupCredits: true,
          subscriptionStatus: true,
        },
      },
      messages: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!thread) notFound();

  // Mark as read for admin when opened (fire-and-forget).
  if (thread.unreadByAdmin > 0) {
    await adminMarkThreadRead(threadId);
  }

  const isClosed = thread.status === "closed";
  const closeAction = isClosed
    ? adminReopenThread.bind(null, threadId)
    : adminCloseThread.bind(null, threadId);

  return (
    <div>
      <Link
        href="/admin/support"
        className="mb-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.threadsLink}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Chat panel */}
        <div className="flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-card shadow-soft" style={{ height: "min(720px, calc(100vh - 14rem))" }}>
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-brand to-brand/85 px-5 py-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{thread.user.email}</p>
              <p className="text-xs text-white/85">
                {fmt(t.messageCount, { count: thread.messages.length })} · {formatTime(thread.lastMessageAt, locale)}
              </p>
            </div>
            <form action={closeAction}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-white/25"
              >
                {isClosed ? (
                  <>
                    <Unlock className="size-3.5" />
                    {t.reopen}
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" />
                    {t.close}
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Messages */}
          <div className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-5 py-5">
            {thread.messages.map((m) => {
              const isUser = m.author === "USER";
              return (
                <div
                  key={m.id}
                  className={cn("flex", isUser ? "justify-start" : "justify-end")}
                >
                  <div
                    className={cn(
                      "flex max-w-[75%] flex-col gap-1",
                      isUser ? "items-start" : "items-end",
                    )}
                  >
                    <div
                      className={cn(
                        "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-soft",
                        isUser
                          ? "rounded-bl-md bg-card text-foreground"
                          : "rounded-br-md bg-brand text-white",
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="px-1 text-[10px] text-muted-foreground">
                      {isUser ? t.msgCustomer : t.msgYou} · {formatTime(m.createdAt, locale)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          <ReplyForm threadId={thread.id} />
        </div>

        {/* User sidebar */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.customer}
            </p>
            <p className="mt-2 truncate text-sm font-medium text-foreground">
              {thread.user.email}
            </p>
            <div className="mt-4 space-y-2">
              <Row
                label={t.subscriptionRow}
                value={thread.user.subscriptionStatus ?? t.noSubscription}
              />
              <Row label={t.subCredit} value={`${thread.user.subscriptionCredits}`} icon={Coins} />
              <Row label={t.topupCredit} value={`${thread.user.topupCredits}`} icon={Coins} />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-card p-5 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {t.thread}
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge
                className={
                  isClosed
                    ? "bg-muted text-muted-foreground"
                    : "bg-emerald-100 text-emerald-700"
                }
              >
                {isClosed ? t.closed : t.open}
              </Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              {fmt(t.startedAt, { date: formatTime(thread.createdAt, locale) })}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <span className="inline-flex items-center gap-1 font-medium text-foreground">
        {Icon && <Icon className="size-3.5 text-brand" />}
        {value}
      </span>
    </div>
  );
}
