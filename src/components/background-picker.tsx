"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Select } from "@base-ui/react/select";
import { Check, ChevronDown, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  changeBackground,
  getCustomBackgroundUploadUrl,
} from "@/server/actions/background";
import type { BackgroundType } from "@/generated/prisma/enums";

type Props = {
  imageId: string;
  currentBgType: BackgroundType;
  /** A jelenlegi projekt custom kulcsa, vagy a user korábban mentett preferenciája. */
  availableCustomKey: string | null;
};

const PRESETS: Array<{ value: BackgroundType; label: string }> = [
  { value: "SHOWROOM", label: "Showroom" },
];

const MAX_BYTES = 12 * 1024 * 1024;

type SelectionValue = "preset:SHOWROOM" | "custom";

function currentSelection(
  bgType: BackgroundType,
  availableCustomKey: string | null,
): SelectionValue {
  if (bgType === "CUSTOM" && availableCustomKey) return "custom";
  return "preset:SHOWROOM";
}

export function BackgroundPicker({
  imageId,
  currentBgType,
  availableCustomKey,
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [customKey, setCustomKey] = useState<string | null>(availableCustomKey);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const selection = currentSelection(currentBgType, customKey);

  const apply = useCallback(
    async (next: SelectionValue, keyOverride?: string) => {
      if (busy) return;
      setError(null);
      setBusy(true);
      try {
        if (next === "custom") {
          const key = keyOverride ?? customKey;
          if (!key) throw new Error("Nincs feltöltött saját háttér.");
          await changeBackground(imageId, "CUSTOM", key);
        } else {
          await changeBackground(imageId, "SHOWROOM", null);
        }
        startTransition(() => router.refresh());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [busy, customKey, imageId, router],
  );

  const handleSelect = useCallback(
    (val: SelectionValue) => {
      if (val === selection) return;
      void apply(val);
    },
    [apply, selection],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      setError(null);
      if (file.size > MAX_BYTES) {
        setError("A háttérkép max 12 MB lehet.");
        return;
      }
      setBusy(true);
      try {
        const { url, key } = await getCustomBackgroundUploadUrl(
          file.name,
          file.type,
        );
        const putRes = await fetch(url, {
          method: "PUT",
          body: file,
          headers: { "Content-Type": file.type },
        });
        if (!putRes.ok) {
          throw new Error(`R2 feltöltés hibázott (HTTP ${putRes.status}).`);
        }
        setCustomKey(key);
        await apply("custom", key);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusy(false);
      }
    },
    [apply],
  );

  return (
    <section className="rounded-3xl border border-border/70 bg-white p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand">
          Háttér kiválasztása
        </h2>
        {busy && <Loader2 className="size-4 animate-spin text-brand" />}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Select.Root
          value={selection}
          onValueChange={(v) => handleSelect(v as SelectionValue)}
          disabled={busy}
        >
          <Select.Trigger
            className={cn(
              "flex h-10 w-full items-center justify-between gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground",
              "hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
              "disabled:pointer-events-none disabled:opacity-60 sm:w-64",
            )}
          >
            <Select.Value>
              {(value) =>
                value === "custom" ? "Saját háttér" : "Showroom"
              }
            </Select.Value>
            <Select.Icon>
              <ChevronDown className="size-4 text-muted-foreground" />
            </Select.Icon>
          </Select.Trigger>
          <Select.Portal>
            <Select.Positioner sideOffset={4} className="z-50">
              <Select.Popup
                className={cn(
                  "min-w-[var(--anchor-width)] overflow-hidden rounded-2xl border border-border/70 bg-white p-1 shadow-soft-lg",
                  "data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 transition-opacity",
                )}
              >
                <Select.List>
                  {PRESETS.map((p) => (
                    <Select.Item
                      key={p.value}
                      value={`preset:${p.value}`}
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    >
                      <Select.ItemText>{p.label}</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="size-4 text-brand" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  ))}
                  {customKey && (
                    <Select.Item
                      value="custom"
                      className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-foreground outline-none data-[highlighted]:bg-accent data-[highlighted]:text-accent-foreground"
                    >
                      <Select.ItemText>Saját háttér</Select.ItemText>
                      <Select.ItemIndicator>
                        <Check className="size-4 text-brand" />
                      </Select.ItemIndicator>
                    </Select.Item>
                  )}
                </Select.List>
              </Select.Popup>
            </Select.Positioner>
          </Select.Portal>
        </Select.Root>

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={busy}
          className={cn(
            "inline-flex h-10 items-center justify-center gap-1.5 rounded-full border border-border bg-white px-4 text-sm font-medium text-foreground",
            "hover:bg-secondary disabled:pointer-events-none disabled:opacity-60",
          )}
        >
          <ImagePlus className="size-4" />
          Saját kép feltöltése
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleUpload(f);
            e.target.value = "";
          }}
        />
      </div>

      {error && (
        <p className="mt-3 text-sm text-rose-600">{error}</p>
      )}
    </section>
  );
}
