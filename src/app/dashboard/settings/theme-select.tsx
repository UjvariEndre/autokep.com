"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { setTheme } from "@/server/actions/theme";
import { useI18n } from "@/i18n/provider";
import { themes, type Theme } from "@/i18n/config";

export function ThemeSelect({ current }: { current: Theme }) {
  const router = useRouter();
  const { dict } = useI18n();
  const [pending, startTransition] = useTransition();
  const [justSaved, setJustSaved] = useState(false);

  function select(next: Theme) {
    if (next === current || pending) return;
    startTransition(async () => {
      await setTheme(next);
      setJustSaved(true);
      // Re-render the dashboard layout, which applies the .dark class server-side.
      router.refresh();
      setTimeout(() => setJustSaved(false), 2000);
    });
  }

  const labels: Record<Theme, string> = {
    light: dict.settings.light,
    dark: dict.settings.dark,
  };
  const icons = { light: Sun, dark: Moon } as const;

  return (
    <div className="flex items-center gap-3">
      <div
        role="group"
        aria-label={dict.settings.themeLabel}
        className={cn("inline-flex rounded-xl border border-border bg-card p-1", pending && "opacity-60")}
      >
        {themes.map((th) => {
          const active = th === current;
          const Icon = icons[th];
          return (
            <button
              key={th}
              type="button"
              onClick={() => select(th)}
              disabled={pending}
              aria-pressed={active}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand text-white shadow-soft"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="size-4" />
              {labels[th]}
            </button>
          );
        })}
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
