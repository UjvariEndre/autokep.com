"use client";

import { useState, type ReactElement } from "react";
import { AlertDialog } from "@base-ui/react/alert-dialog";
import { format } from "date-fns";
import { hu, enUS } from "date-fns/locale";
import { Loader2, Trash2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { deleteProject } from "@/server/actions/delete";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

type Props = {
  projectId: string;
  projectName: string;
  createdAt: Date | string;
  /** A trigger gomb, amit a felhasználó megnyom a modal megnyitásához. */
  trigger: ReactElement;
  /** Sikeres törlés után meghívott callback (pl. router.push). */
  onDeleted?: () => void;
};

export function DeleteProjectDialog({
  projectId,
  projectName,
  createdAt,
  trigger,
  onDeleted,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { locale, dict } = useI18n();
  const t = dict.deleteDialog;

  const dateStr = format(
    typeof createdAt === "string" ? new Date(createdAt) : createdAt,
    locale === "hu" ? "yyyy. MMMM d. HH:mm" : "MMMM d, yyyy HH:mm",
    { locale: locale === "hu" ? hu : enUS },
  );

  async function handleConfirm() {
    setError(null);
    setBusy(true);
    try {
      await deleteProject(projectId);
      setOpen(false);
      onDeleted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlertDialog.Root open={open} onOpenChange={setOpen}>
      <AlertDialog.Trigger render={trigger} />
      <AlertDialog.Portal>
        <AlertDialog.Backdrop className="fixed inset-0 z-50 bg-foreground/40 backdrop-blur-sm transition-opacity data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <AlertDialog.Popup
          className={cn(
            "fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2",
            "rounded-3xl border border-border/70 bg-card p-6 shadow-soft-lg transition-all duration-200",
            "data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
          )}
        >
          <div className="mb-4 flex size-11 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <Trash2 className="size-5" />
          </div>
          <AlertDialog.Title className="text-lg font-semibold tracking-tight text-foreground">
            {t.title}
          </AlertDialog.Title>
          <AlertDialog.Description className="mt-2 text-sm text-muted-foreground">
            {t.description}
          </AlertDialog.Description>

          <div className="mt-4 rounded-2xl border border-border/60 bg-secondary/50 px-4 py-3">
            <p className="truncate text-sm font-medium text-foreground">
              {projectName}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">{dateStr}</p>
          </div>

          {error && (
            <p className="mt-3 text-sm text-rose-600">{error}</p>
          )}

          <div className="mt-6 flex items-center justify-end gap-2">
            <AlertDialog.Close
              disabled={busy}
              className={cn(buttonVariants({ variant: "ghost" }))}
            >
              {t.cancel}
            </AlertDialog.Close>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={busy}
              className={cn(
                "inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-medium",
                "bg-rose-600 text-white shadow-[0_4px_12px_-4px_rgba(225,29,72,0.35)] transition-colors",
                "hover:bg-rose-700 disabled:pointer-events-none disabled:opacity-60",
              )}
            >
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {t.confirm}
            </button>
          </div>
        </AlertDialog.Popup>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}
