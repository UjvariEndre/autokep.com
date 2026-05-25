"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { ArrowLeft, ImageIcon, Loader2, Upload, Wand2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getUploadUrl } from "@/server/actions/upload";
import { processImage } from "@/server/actions/process";
import { takePendingFile } from "@/lib/upload-store";
import { cn } from "@/lib/utils";
import { useI18n } from "@/i18n/provider";

const MAX_BYTES = 12 * 1024 * 1024;

export default function NewProjectPage() {
  const router = useRouter();
  const { dict } = useI18n();
  const t = dict.newProject;
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const pending = takePendingFile();
    if (pending) setFile(pending);
  }, []);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onDrop = useCallback((accepted: File[]) => {
    setError(null);
    if (accepted[0]) setFile(accepted[0]);
  }, []);

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
    disabled: isProcessing,
  });

  async function handleSubmit() {
    if (!file) return;
    setError(null);
    setIsProcessing(true);
    try {
      const { url, key } = await getUploadUrl(file.name, file.type);
      const putRes = await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!putRes.ok) {
        throw new Error(t.uploadFailed.replace("{status}", String(putRes.status)));
      }
      const { projectId } = await processImage(key, file.name);
      router.push(`/dashboard/projects/${projectId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg === "NO_CREDITS") {
        router.push("/pricing");
        return;
      }
      setError(msg);
      setIsProcessing(false);
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href="/dashboard"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
        {t.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.subtitle}
      </p>

      {error && (
        <div className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-soft">
          <p className="font-medium">{t.errorTitle}</p>
          <p className="mt-1">{error}</p>
          <button
            type="button"
            className="mt-2 underline underline-offset-2 hover:no-underline"
            onClick={() => setError(null)}
          >
            {t.retry}
          </button>
        </div>
      )}

      {!file && (
        <div
          {...getRootProps()}
          className={cn(
            "mt-8 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed py-24 text-center transition-all",
            isDragActive
              ? "border-brand bg-accent/60 shadow-soft-lg"
              : "border-border bg-white hover:border-brand/40 hover:bg-accent/30",
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
            {t.or} <span className="text-brand underline-offset-2 hover:underline">{t.browse}</span>
          </p>
          <p className="mt-6 text-xs text-muted-foreground">
            {t.fileHint}
          </p>
        </div>
      )}

      {file && previewUrl && (
        <div className="mt-8 flex flex-col gap-6">
          <div className="overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={previewUrl}
              alt={t.previewAlt}
              className="max-h-[500px] w-full object-contain"
            />
          </div>

          {isProcessing ? (
            <div className="flex items-center gap-3 rounded-2xl border border-indigo-100 bg-accent/60 px-5 py-4 text-sm text-accent-foreground shadow-soft">
              <Loader2 className="size-5 animate-spin text-brand" />
              <span className="font-medium">{t.processing}</span>
              <span className="text-muted-foreground">{t.processingSuffix}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-4">
              <button
                type="button"
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                onClick={() => setFile(null)}
              >
                <ImageIcon className="size-4" />
                {t.chooseAnother}
              </button>
              <Button onClick={handleSubmit} disabled={isProcessing} size="lg">
                <Wand2 className="size-4" />
                {t.startProcessing}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
