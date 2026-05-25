"use client";

import { useState } from "react";
import { Loader2, Send } from "lucide-react";
import { adminReply } from "@/server/actions/support";
import { useI18n } from "@/i18n/provider";

const MAX_MESSAGE = 2000;

export function ReplyForm({ threadId }: { threadId: string }) {
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { dict } = useI18n();
  const t = dict.admin;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (sending || !body.trim()) return;
    setSending(true);
    setError(null);
    const text = body;
    setBody("");

    const res = await adminReply({ threadId, body: text });
    setSending(false);

    if (!res.ok) {
      setError(res.error);
      setBody(text);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex-shrink-0 border-t border-border/60 bg-card p-4"
    >
      {error && (
        <p className="mb-2 rounded-lg bg-rose-50 px-3 py-1.5 text-xs text-rose-700">
          {error}
        </p>
      )}
      <div className="flex items-end gap-2">
        <textarea
          rows={2}
          maxLength={MAX_MESSAGE}
          placeholder={t.replyPlaceholder}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
              e.preventDefault();
              handleSubmit(e as unknown as React.FormEvent);
            }
          }}
          disabled={sending}
          className="max-h-48 min-h-[60px] flex-1 resize-y rounded-xl border border-border bg-card px-3 py-2 text-sm leading-relaxed outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-brand focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={sending || !body.trim()}
          aria-label={t.sendAria}
          className="inline-flex h-[60px] w-12 shrink-0 items-center justify-center rounded-xl bg-brand text-white shadow-soft transition-colors hover:bg-brand/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {sending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
        </button>
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        {t.replyNote1}{" "}
        {t.replyTip} <kbd className="rounded bg-secondary px-1.5 py-0.5 text-[10px]">Ctrl+Enter</kbd> {t.replyTipSuffix}
      </p>
    </form>
  );
}
