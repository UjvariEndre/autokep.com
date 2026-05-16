"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { getUploadUrl } from "@/server/actions/upload";
import { processImage } from "@/server/actions/process";

const MAX_BYTES = 12 * 1024 * 1024;

export default function NewProjectPage() {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
        throw new Error(`R2 feltöltés hibázott (HTTP ${putRes.status}).`);
      }
      const { projectId } = await processImage(key, file.name);
      router.push(`/dashboard/projects/${projectId}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setIsProcessing(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-4">
          <Link href="/dashboard" className="text-sm text-zinc-600 hover:text-zinc-900">
            ← Vissza a projektekhez
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="mb-8 text-3xl font-semibold tracking-tight">Új projekt</h1>

        {error && (
          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <p className="font-medium">Hiba történt</p>
            <p>{error}</p>
            <button
              type="button"
              className="mt-2 underline"
              onClick={() => setError(null)}
            >
              Próbáld újra
            </button>
          </div>
        )}

        {!file && (
          <div
            {...getRootProps()}
            className={`flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed py-24 text-center transition-colors ${
              isDragActive
                ? "border-primary bg-primary/5"
                : "border-zinc-300 bg-white hover:bg-zinc-50"
            }`}
          >
            <input {...getInputProps()} />
            <p className="text-lg font-medium text-zinc-800">
              Húzd ide az autós képet, vagy kattints a tallózáshoz
            </p>
            <p className="mt-2 text-sm text-zinc-500">
              JPG, PNG, WebP, max 12 MB
            </p>
          </div>
        )}

        {file && previewUrl && (
          <div className="flex flex-col gap-6">
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewUrl}
                alt="Előnézet"
                className="max-h-[500px] w-full object-contain"
              />
            </div>

            {isProcessing ? (
              <div className="flex items-center gap-3 rounded-xl bg-blue-50 px-4 py-3 text-sm text-blue-800">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
                <span>Háttér eltávolítása, várj 2-5 másodpercet...</span>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <button
                  type="button"
                  className="text-sm text-zinc-600 underline"
                  onClick={() => setFile(null)}
                >
                  Másikat választok
                </button>
                <Button onClick={handleSubmit} disabled={isProcessing}>
                  Feldolgozás indítása
                </Button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
