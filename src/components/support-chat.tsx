"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { format, isToday } from "date-fns";
import { hu } from "date-fns/locale";
import { Loader2, LogIn, MessageCircle, Send, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getMyThread,
  markMyThreadRead,
  submitSupportMessage,
} from "@/server/actions/support";

const MAX_MESSAGE = 2000;
const POLL_OPEN_MS = 8000;

type Msg = {
  id: string;
  author: "USER" | "ADMIN";
  body: string;
  createdAt: string;
};

type Thread = {
  id: string;
  status: string;
  messages: Msg[];
};

function formatTime(iso: string): string {
  const d = new Date(iso);
  if (isToday(d)) return format(d, "HH:mm");
  return format(d, "MMM d. HH:mm", { locale: hu });
}

export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [thread, setThread] = useState<Thread | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasUnread, setHasUnread] = useState(false);
  const { isLoaded, isSignedIn } = useUser();
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const refresh = useCallback(async () => {
    if (!isSignedIn) return;
    try {
      const { thread: t } = await getMyThread();
      setThread(t);
      const adminLast = t?.messages.findLast?.((m) => m.author === "ADMIN");
      const userLast = t?.messages.findLast?.((m) => m.author === "USER");
      const unread =
        !!adminLast &&
        (!userLast ||
          new Date(adminLast.createdAt) > new Date(userLast.createdAt));
      setHasUnread(unread);
    } catch (err) {
      console.error("refresh thread failed", err);
    }
  }, [isSignedIn]);

  // Initial load when signed-in user is ready.
  useEffect(() => {
    if (isLoaded && isSignedIn) refresh();
  }, [isLoaded, isSignedIn, refresh]);

  // Poll while open.
  useEffect(() => {
    if (!open || !isSignedIn) return;
    const i = setInterval(refresh, POLL_OPEN_MS);
    return () => clearInterval(i);
  }, [open, isSignedIn, refresh]);

  // Mark read shortly after opening (let user actually see badge first).
  useEffect(() => {
    if (open && isSignedIn && hasUnread) {
      const t = setTimeout(() => {
        markMyThreadRead().then(() => setHasUnread(false));
      }, 1200);
      return () => clearTimeout(t);
    }
  }, [open, isSignedIn, hasUnread]);

  // Auto-focus textarea when opening.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => textareaRef.current?.focus(), 150);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Auto-scroll to bottom on new messages or open.
  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, thread?.messages.length]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !draft.trim()) return;
    setSending(true);
    setError(null);
    const body = draft;
    setDraft("");

    const res = await submitSupportMessage({ body });
    setSending(false);

    if (res.ok) {
      await refresh();
    } else {
      setError(res.error);
      setDraft(body); // restore so user doesn't lose text
    }
  }

  return (
    <>
      {/* Floating bubble */}
      <button
        type="button"
        aria-label={open ? "Chat bezárása" : "Üzenj nekünk"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "fixed bottom-5 right-5 z-50 inline-flex size-14 items-center justify-center rounded-full bg-brand text-white shadow-soft-lg transition-all hover:scale-105 hover:bg-brand/90 active:scale-95",
          open && "rotate-90",
        )}
      >
        {open ? <X className="size-6" /> : <MessageCircle className="size-6" />}
        {hasUnread && !open && (
          <span className="absolute -right-0.5 -top-0.5 flex size-3.5 items-center justify-center">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-rose-400 opacity-75" />
            <span className="relative inline-flex size-3 rounded-full bg-rose-500 ring-2 ring-white" />
          </span>
        )}
      </button>

      {/* Panel */}
      <div
        role="dialog"
        aria-label="Ügyfélszolgálati chat"
        aria-hidden={!open}
        className={cn(
          "fixed bottom-24 right-5 z-50 flex w-[min(380px,calc(100vw-2.5rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft-lg transition-all duration-200",
          open
            ? "pointer-events-auto scale-100 opacity-100"
            : "pointer-events-none scale-95 opacity-0",
        )}
        style={{ height: "min(560px, calc(100vh - 10rem))" }}
      >
        {/* Header */}
        <div className="flex-shrink-0 bg-gradient-to-br from-brand to-brand/85 p-5 text-white">
          <h3 className="text-base font-semibold tracking-tight">Segítünk</h3>
          <p className="mt-1 text-xs text-white/85">
            {!isSignedIn
              ? "Jelentkezz be a chathez."
              : "Általában néhány órán belül válaszolunk."}
          </p>
        </div>

        {/* Body */}
        {!isLoaded ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="size-5 animate-spin text-muted-foreground" />
          </div>
        ) : !isSignedIn ? (
          <SignInPrompt />
        ) : (
          <>
            <div
              ref={scrollRef}
              className="flex-1 space-y-3 overflow-y-auto bg-secondary/30 px-4 py-5"
            >
              {!thread || thread.messages.length === 0 ? (
                <EmptyState />
              ) : (
                thread.messages.map((m) => <MessageBubble key={m.id} msg={m} />)
              )}
            </div>

            <form
              onSubmit={handleSend}
              className="flex-shrink-0 border-t border-border/60 bg-white p-3"
            >
              {error && (
                <p className="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
                  {error}
                </p>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  maxLength={MAX_MESSAGE}
                  placeholder="Írj egy üzenetet..."
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend(e as unknown as React.FormEvent);
                    }
                  }}
                  disabled={sending}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-xl border border-border bg-white px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand focus:ring-2 focus:ring-brand/20"
                />
                <button
                  type="submit"
                  disabled={sending || !draft.trim()}
                  aria-label="Küldés"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-soft transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {sending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Send className="size-4" />
                  )}
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </>
  );
}

function SignInPrompt() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-8 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-accent text-brand">
        <LogIn className="size-5" />
      </div>
      <p className="text-sm font-medium text-foreground">
        Jelentkezz be a chathez
      </p>
      <p className="text-xs text-muted-foreground">
        Hogy lássuk az előzményeket és vissza tudjunk írni, csak bejelentkezett felhasználóként chatelhetsz.
      </p>
      <Link
        href="/sign-in"
        className="mt-1 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-sm font-medium text-white shadow-soft transition-colors hover:bg-brand/90"
      >
        Bejelentkezés
      </Link>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 text-center">
      <div className="flex size-10 items-center justify-center rounded-full bg-accent text-brand">
        <MessageCircle className="size-5" />
      </div>
      <p className="text-sm font-medium text-foreground">Még nincs üzenet</p>
      <p className="max-w-[240px] text-xs text-muted-foreground">
        Írd le miben tudunk segíteni. Általában néhány órán belül válaszolunk.
      </p>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  const isUser = msg.author === "USER";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div className={cn("flex max-w-[80%] flex-col gap-1", isUser ? "items-end" : "items-start")}>
        <div
          className={cn(
            "whitespace-pre-wrap break-words rounded-2xl px-3.5 py-2 text-sm leading-relaxed shadow-soft",
            isUser
              ? "rounded-br-md bg-brand text-white"
              : "rounded-bl-md bg-white text-foreground",
          )}
        >
          {msg.body}
        </div>
        <span className="px-1 text-[10px] text-muted-foreground">
          {isUser ? "Te" : "Autokep"} · {formatTime(msg.createdAt)}
        </span>
      </div>
    </div>
  );
}
