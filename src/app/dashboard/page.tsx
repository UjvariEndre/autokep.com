"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import { useDropzone } from "react-dropzone";
import { Car, Sparkles, Upload, Wand2 } from "lucide-react";
import { setPendingFile } from "@/lib/upload-store";
import { cn } from "@/lib/utils";

const MAX_BYTES = 12 * 1024 * 1024;

export default function DashboardHomePage() {
  const router = useRouter();

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
          AI háttércsere autós fotókhoz
        </span>

        <h1 className="mt-5 font-heading text-4xl font-semibold tracking-tight text-foreground md:text-5xl">
          Tölts fel egy képet,<br />
          a többit elintézzük.
        </h1>
        <p className="mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
          Húzd ide az autós fotódat — 2-5 másodperc alatt cseréljük a hátteret
          AI-jal, és letölthető végeredményt adunk.
        </p>
      </div>

      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          "mt-10 flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed py-20 text-center transition-all",
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
          Húzd ide az autós képet
        </p>
        <p className="mt-2 text-sm text-muted-foreground">
          vagy{" "}
          <span className="text-brand underline-offset-2 hover:underline">
            kattints a tallózáshoz
          </span>
        </p>
        <p className="mt-6 text-xs text-muted-foreground">
          JPG · PNG · WebP · max 12 MB
        </p>
      </div>

      {/* Mini steps */}
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {[
          { icon: Upload, label: "1. Feltöltés", text: "Drag & drop vagy tallózás" },
          { icon: Wand2, label: "2. AI cseréli a hátteret", text: "2-5 másodperc alatt" },
          { icon: Sparkles, label: "3. Letöltés", text: "Showroom minőségű végeredmény" },
        ].map(({ icon: Icon, label, text }) => (
          <div
            key={label}
            className="rounded-2xl border border-border/70 bg-white p-4 shadow-soft"
          >
            <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
              <Icon className="size-4" />
            </div>
            <p className="text-sm font-medium text-foreground">{label}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
