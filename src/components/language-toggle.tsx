"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { cn } from "@/lib/utils";
import { setLocale } from "@/server/actions/locale";
import { useI18n } from "@/i18n/provider";
import { locales, type Locale } from "@/i18n/config";

const SHORT: Record<Locale, string> = { hu: "HU", en: "EN" };

/**
 * Compact HU/EN segmented toggle for public nav bars.
 *
 * Uses the cookie-based `setLocale` action — for signed-out visitors that only
 * writes the locale cookie (never Supabase), which is also readable server-side
 * so the page renders in the chosen language with no flash.
 */
export function LanguageToggle({ className }: { className?: string }) {
  const router = useRouter();
  const { locale, dict } = useI18n();
  const [pending, startTransition] = useTransition();

  function select(next: Locale) {
    if (next === locale || pending) return;
    startTransition(async () => {
      await setLocale(next);
      router.refresh();
    });
  }

  return (
    <div
      role="group"
      aria-label={dict.settings.languageLabel}
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full border border-border/70 bg-white/70 p-0.5 text-xs font-medium shadow-soft backdrop-blur",
        pending && "opacity-60",
        className,
      )}
    >
      <Globe className="ml-1.5 size-3.5 text-muted-foreground" aria-hidden />
      {locales.map((l) => {
        const active = l === locale;
        return (
          <button
            key={l}
            type="button"
            onClick={() => select(l)}
            disabled={pending}
            aria-pressed={active}
            aria-label={l === "hu" ? dict.settings.hungarian : dict.settings.english}
            className={cn(
              "rounded-full px-2 py-1 transition-colors",
              active
                ? "bg-brand text-white shadow-soft"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {SHORT[l]}
          </button>
        );
      })}
    </div>
  );
}
