"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Globe, Loader2 } from "lucide-react";
import { setLocale } from "@/server/actions/locale";
import { useI18n } from "@/i18n/provider";
import type { Locale } from "@/i18n/config";

export function LanguageSelect() {
  const router = useRouter();
  const { locale, dict } = useI18n();
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  function handleChange(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      setJustSaved(true);
      // Re-render server components (and the root layout) with the new locale.
      router.refresh();
      setTimeout(() => setJustSaved(false), 2000);
    });
  }

  return (
    <div className="flex items-center gap-3">
      <div className="relative">
        <Globe className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <select
          value={locale}
          disabled={pending}
          onChange={(e) => handleChange(e.target.value as Locale)}
          aria-label={dict.settings.languageLabel}
          className="h-11 w-56 appearance-none rounded-xl border border-border bg-white pl-9 pr-9 text-sm font-medium text-foreground shadow-soft outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/20 disabled:opacity-60"
        >
          <option value="hu">{dict.settings.hungarian}</option>
          <option value="en">{dict.settings.english}</option>
        </select>
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          fill="currentColor"
        >
          <path d="M5.5 7.5 10 12l4.5-4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      {pending ? (
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      ) : justSaved ? (
        <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
          <Check className="size-4" />
          {dict.settings.saved}
        </span>
      ) : null}
    </div>
  );
}
