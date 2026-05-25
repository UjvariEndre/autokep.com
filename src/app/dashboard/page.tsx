"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Car, Sparkles, Upload, Wand2 } from "lucide-react";
import { setPendingFile } from "@/lib/upload-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

const MAX_BYTES = 12 * 1024 * 1024;

export default function DashboardHomePage() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.dashboardHome;
  const stepIcons = [Upload, Wand2, Sparkles];

  const onDrop = useCallback(
    (accepted: File[]) => {
      const file = accepted[0];
      if (!file) return;
      setPendingFile(file);
      router.push("/dashboard/new");
    },
    [router],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    maxFiles: 1,
    maxSize: MAX_BYTES,
    multiple: false,
  });

  return (
    <div className="mx-auto max-w-3xl">
      {/* Logo + hero */}
      <div className="flex flex-col items-center text-center">
        <span className="mb-6 flex size-14 items-center justify-center rounded-2xl bg-brand shadow-soft-lg">
          <Car className="size-7 text-white" />
        </span>

        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-3 py-1 text-xs font-medium text-accent-foreground">
          <Sparkles className="size-3.5 text-brand" />
          {t.badge}
        </span>

        <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          {t.titleLine1}<br />
          {t.titleLine2}
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          {t.subtitle}
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "mt-10 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed py-20 text-center transition-all",
          isDragActive
            ? "border-brand bg-accent/60 shadow-soft-lg"
            : "border-border bg-card hover:border-brand/40 hover:bg-accent/30",
        )}
      >
        <input {...getInputProps()} />
        <div
          className={cn(
            "mb-5 flex size-16 items-center justify-center rounded-2xl transition-colors",
            isDragActive
              ? "bg-brand text-white"
              : "bg-accent text-accent-foreground",
          )}
        >
          <Upload className="size-7" />
        </div>
        <p className="text-lg font-medium text-foreground">
          {t.dropTitle}
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          {t.or}{" "}
          <span className="text-brand underline-offset-2 hover:underline">
            {t.browse}
          </span>
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          {t.fileHint}
        </p>
      </div>

      {/* Mini steps */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {t.steps.map(({ label, text }, i) => {
          const Icon = stepIcons[i] ?? Upload;
          return (
          <div
            key={label}
            className="rounded-2xl border border-border/70 bg-card p-4 shadow-soft"
          >
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
          </div>
          );
        })}
      </div>
    </div>
  );
}
