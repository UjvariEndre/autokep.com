import Link from "next/link";
import { notFound } from "next/navigation";
import { format, isToday } from "date-fns";
import { hu } from "date-fns/locale";
import { ArrowLeft, Coins, Lock, Unlock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import {
  adminCloseThread,
  adminMarkThreadRead,
  adminReopenThread,
} from "@/server/actions/support";
import { ReplyForm } from "./reply-form";

export const dynamic = "force-dynamic";

function formatTime(d: Date): string {
  if (isToday(d)) return format(d, "HH:mm");
  return format(d, "yyyy. MMM d. HH:mm", { locale: hu });
}

export default async function AdminThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = await params;
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
        Beszélgetések
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
        {/* Chat panel */}
        <div className="flex flex-col overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft" style={{ height: "min(720px, calc(100vh - 14rem))" }}>
          {/* Header */}
          <div className="flex flex-shrink-0 items-center justify-between gap-3 border-b border-border/60 bg-gradient-to-br from-brand to-brand/85 px-5 py-4 text-white">
            <div className="min-w-0">
              <p className="truncate text-base font-semibold">{thread.user.email}</p>
              <p className="text-xs text-white/85">
                {thread.messages.length} üzenet · {formatTime(thread.lastMessageAt)}
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
                    Újranyitás
                  </>
                ) : (
                  <>
                    <Lock className="size-3.5" />
                    Lezárás
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
                          ? "rounded-bl-md bg-white text-foreground"
                          : "rounded-br-md bg-brand text-white",
                      )}
                    >
                      {m.body}
                    </div>
                    <span className="px-1 text-[10px] text-muted-foreground">
                      {isUser ? "Ügyfél" : "Te"} · {formatTime(m.createdAt)}
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
          <div className="rounded-2xl border border-border/70 bg-white p-5 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Ügyfél
            </p>
            <p className="mt-2 truncate text-sm font-medium text-foreground">
              {thread.user.email}
            </p>
            <div className="mt-4 space-y-2">
              <Row
                label="Előfizetés"
                value={thread.user.subscriptionStatus ?? "nincs"}
              />
              <Row label="Sub kredit" value={`${thread.user.subscriptionCredits}`} icon={Coins} />
              <Row label="Top-up kredit" value={`${thread.user.topupCredits}`} icon={Coins} />
            </div>
          </div>

          <div className="rounded-2xl border border-border/70 bg-white p-5 shadow-soft">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Beszélgetés
            </p>
            <div className="mt-3 flex items-center gap-2">
              <Badge
                className={
                  isClosed
                    ? "bg-muted text-muted-foreground"
                    : "bg-emerald-100 text-emerald-700"
                }
              >
                {isClosed ? "Lezárva" : "Nyitva"}
              </Badge>
            </div>
            <p className="mt-3 text-xs text-muted-foreground">
              Kezdődött: {formatTime(thread.createdAt)}
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
