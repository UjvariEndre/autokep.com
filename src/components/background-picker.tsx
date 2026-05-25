"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, ImagePlus, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  changeBackground,
  getCustomBackgroundUploadUrl,
} from "@/server/actions/background";
import { SHOWROOM_PRESETS, showroomThumbPath } from "@/lib/backgrounds";
import { useI18n } from "@/i18n/provider";
import type { BackgroundType } from "@/generated/prisma/enums";

type Props = {
  imageId: string;
  currentBgType: BackgroundType;
  currentPresetKey: string;
  /** R2 key of a previously uploaded custom bg, if any. */
  savedCustomKey: string | null;
  /** Presigned URL for the saved custom bg thumbnail. */
  savedCustomUrl: string | null;
};

const MAX_BYTES = 12 * 1024 * 1024;

export function BackgroundPicker({
  imageId,
  currentBgType,
  currentPresetKey,
  savedCustomKey,
  savedCustomUrl,
}: Props) {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.backgroundPicker;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const busy = busyKey !== null;

  const applyShowroom = useCallback(
    async (presetKey: string) => {
      if (busy) return;
      if (currentBgType === "SHOWROOM" && presetKey === currentPresetKey) return;
      setError(null);
      setBusyKey(`preset:${presetKey}`);
      try {
        await changeBackground(imageId, "SHOWROOM", { presetKey });
        startTransition(() => router.refresh());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyKey(null);
      }
    },
    [busy, currentBgType, currentPresetKey, imageId, router],
  );

  const applyCustom = useCallback(
    async (customKey: string) => {
      if (busy) return;
      setError(null);
      setBusyKey(`custom:${customKey}`);
      try {
        await changeBackground(imageId, "CUSTOM", { customKey });
        startTransition(() => router.refresh());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyKey(null);
      }
    },
    [busy, imageId, router],
  );

  const handleUpload = useCallback(
    async (file: File) => {
      if (busy) return;
      setError(null);
      if (file.size > MAX_BYTES) {
        setError(t.tooLarge);
        return;
      }
      setBusyKey("upload");
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
          throw new Error(t.uploadFailed.replace("{status}", String(putRes.status)));
        }
        await changeBackground(imageId, "CUSTOM", { customKey: key });
        startTransition(() => router.refresh());
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setBusyKey(null);
      }
    },
    [busy, imageId, router, t],
  );

  return (
    <section className="rounded-3xl border border-border/70 bg-card p-5 shadow-soft">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-brand">
          {t.title}
        </h2>
        {busy && <Loader2 className="size-4 animate-spin text-brand" />}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-7">
        {SHOWROOM_PRESETS.map((p) => {
          const selected =
            currentBgType === "SHOWROOM" && p.key === currentPresetKey;
          const loading = busyKey === `preset:${p.key}`;
          return (
            <BgTile
              key={p.key}
              label={p.label}
              imageUrl={showroomThumbPath(p.key)}
              selected={selected}
              loading={loading}
              disabled={busy && !loading}
              onClick={() => void applyShowroom(p.key)}
            />
          );
        })}

        {savedCustomKey && savedCustomUrl && (
          <BgTile
            label={t.customLabel}
            imageUrl={savedCustomUrl}
            selected={currentBgType === "CUSTOM"}
            loading={busyKey === `custom:${savedCustomKey}`}
            disabled={busy && busyKey !== `custom:${savedCustomKey}`}
            onClick={() => void applyCustom(savedCustomKey)}
          />
        )}

        <UploadTile
          ariaLabel={t.uploadAria}
          label={t.uploadLabel}
          loading={busyKey === "upload"}
          disabled={busy && busyKey !== "upload"}
          onClick={() => fileInputRef.current?.click()}
        />
      </div>

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

      {error && <p className="mt-3 text-sm text-rose-600">{error}</p>}
    </section>
  );
}

function BgTile({
  label,
  imageUrl,
  selected,
  loading,
  disabled,
  onClick,
}: {
  label: string;
  imageUrl: string;
  selected: boolean;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      aria-pressed={selected}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-xl border bg-secondary transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        selected
          ? "border-brand ring-2 ring-brand"
          : "border-border/70 hover:border-foreground/40",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt=""
        className="absolute inset-0 size-full object-cover transition-transform group-hover:scale-[1.03]"
      />
      {selected && (
        <span className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-brand text-white shadow-sm">
          <Check className="size-3.5" strokeWidth={3} />
        </span>
      )}
      {loading && (
        <span className="absolute inset-0 flex items-center justify-center bg-card/70">
          <Loader2 className="size-5 animate-spin text-brand" />
        </span>
      )}
    </button>
  );
}

function UploadTile({
  ariaLabel,
  label,
  loading,
  disabled,
  onClick,
}: {
  ariaLabel: string;
  label: string;
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        "group relative aspect-[4/3] overflow-hidden rounded-xl border-2 border-dashed bg-card text-muted-foreground transition-all",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40",
        "hover:border-brand hover:text-brand",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span className="absolute inset-0 flex flex-col items-center justify-center gap-1.5 text-xs font-medium">
        {loading ? (
          <Loader2 className="size-5 animate-spin text-brand" />
        ) : (
          <>
            <ImagePlus className="size-5" />
            {label}
          </>
        )}
      </span>
    </button>
  );
}
