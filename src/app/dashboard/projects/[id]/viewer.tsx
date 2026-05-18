"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Download, Loader2, Pencil, RotateCcw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button";
import { DeleteProjectDialog } from "@/components/delete-project-dialog";
import { BackgroundPicker } from "@/components/background-picker";
import { cn } from "@/lib/utils";
import { editImage } from "@/server/actions/edit";
import type { BackgroundType, ProcessStatus } from "@/generated/prisma/enums";

type Props = {
  projectId: string;
  projectName: string;
  projectCreatedAt: string;
  backgroundType: BackgroundType;
  availableCustomKey: string | null;
  imageId: string;
  status: ProcessStatus;
  errorMessage: string | null;
  initialRotate: number;
  initialOffsetX: number;
  initialOffsetY: number;
  initialZoom: number;
  originalUrl: string | null;
  processedUrl: string | null;
  downloadUrl: string | null;
  cutoutUrl: string | null;
};

const SHOWROOM_URL = "/images/shr02.png";

// Match composite.ts SHOWROOM preset.
const FLOOR_Y = 0.88;
const CROP_TOP = 0.10;
const CAR_WIDTH_SCALE = 0.65;
const SOLID_ALPHA_THRESHOLD = 200;

function loadImage(src: string, anonymous = false): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Cross-origin images need anonymous CORS so the canvas isn't tainted —
    // getImageData would otherwise throw on the rotated-cutout buffer.
    if (anonymous) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Kép betöltési hiba: ${src}`));
    img.src = src;
  });
}

function compose(
  canvas: HTMLCanvasElement,
  cutoutImg: HTMLImageElement,
  bgImg: HTMLImageElement,
  rotateDeg: number,
  offsetXPct: number,
  offsetYPct: number,
  zoom: number,
) {
  // Canvas dimensions = bounding box of rotated cutout (matches Sharp default).
  const angleRad = (rotateDeg * Math.PI) / 180;
  const sin = Math.abs(Math.sin(angleRad));
  const cos = Math.abs(Math.cos(angleRad));
  const cw = cutoutImg.naturalWidth;
  const ch = cutoutImg.naturalHeight;
  const W = Math.max(1, Math.ceil(cw * cos + ch * sin));
  const H = Math.max(1, Math.ceil(cw * sin + ch * cos));
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Background: cropTop + cover-fit centered.
  const cropPx = bgImg.naturalHeight * CROP_TOP;
  const bgW0 = bgImg.naturalWidth;
  const bgH0 = bgImg.naturalHeight - cropPx;
  const bgScale = Math.max(W / bgW0, H / bgH0);
  const bgW = bgW0 * bgScale;
  const bgH = bgH0 * bgScale;
  const bgDx = (W - bgW) / 2;
  const bgDy = (H - bgH) / 2;
  ctx.drawImage(bgImg, 0, cropPx, bgW0, bgH0, bgDx, bgDy, bgW, bgH);

  // 2. Render rotated cutout to an offscreen canvas.
  const off = document.createElement("canvas");
  off.width = W;
  off.height = H;
  const offCtx = off.getContext("2d");
  if (!offCtx) return;
  offCtx.translate(W / 2, H / 2);
  offCtx.rotate(angleRad);
  offCtx.drawImage(cutoutImg, -cw / 2, -ch / 2);

  // 3. Bbox scan on the rotated cutout (solid > 200 for anchor, > 0 for extract).
  const data = offCtx.getImageData(0, 0, W, H).data;
  let sMinX = W, sMaxX = -1, sMinY = H, sMaxY = -1;
  let vMinX = W, vMaxX = -1, vMinY = H, vMaxY = -1;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const a = data[(y * W + x) * 4 + 3];
      if (a > 0) {
        if (x < vMinX) vMinX = x;
        if (x > vMaxX) vMaxX = x;
        if (y < vMinY) vMinY = y;
        if (y > vMaxY) vMaxY = y;
        if (a > SOLID_ALPHA_THRESHOLD) {
          if (x < sMinX) sMinX = x;
          if (x > sMaxX) sMaxX = x;
          if (y < sMinY) sMinY = y;
          if (y > sMaxY) sMaxY = y;
        }
      }
    }
  }
  if (sMaxX < 0) return;

  const solidW = sMaxX - sMinX + 1;
  const solidH = sMaxY - sMinY + 1;
  const visW = vMaxX - vMinX + 1;
  const visH = vMaxY - vMinY + 1;

  // 4. Scale: body to 65% canvas, clamp so the visible region fits, then
  // apply user zoom (>1 lets the car overflow the canvas).
  const desired = (W * CAR_WIDTH_SCALE) / solidW;
  const maxScale = Math.min(W / visW, H / visH);
  const baseScale = Math.min(desired, maxScale);
  const scale = baseScale * zoom;
  const sVW = Math.max(1, Math.round(visW * scale));
  const sVH = Math.max(1, Math.round(visH * scale));

  // 5. Anchor (solid center horizontally at canvas center, solid bottom at floorY)
  //    + user offset (percent of canvas dims).
  const solidInVisCenterX = sMinX - vMinX + solidW / 2;
  const solidInVisBottomY = sMinY - vMinY + solidH;
  const scaledSolidCx = solidInVisCenterX * scale;
  const scaledSolidBy = solidInVisBottomY * scale;
  const offsetPxX = (offsetXPct / 100) * W;
  const offsetPxY = (offsetYPct / 100) * H;
  const rawLeft = W / 2 - scaledSolidCx + offsetPxX;
  const rawTop = H * FLOOR_Y - scaledSolidBy + offsetPxY;
  const slackX = W - sVW;
  const slackY = H - sVH;
  const insLeft = Math.max(Math.min(0, slackX), Math.min(Math.max(0, slackX), Math.round(rawLeft)));
  const insTop = Math.max(Math.min(0, slackY), Math.min(Math.max(0, slackY), Math.round(rawTop)));

  // 6. Draw scaled visible region of the rotated cutout.
  ctx.drawImage(off, vMinX, vMinY, visW, visH, insLeft, insTop, sVW, sVH);
}

export function ProjectViewer(props: Props) {
  const {
    projectId,
    projectName,
    projectCreatedAt,
    backgroundType,
    availableCustomKey,
    imageId,
    status,
    errorMessage,
    initialRotate,
    initialOffsetX,
    initialOffsetY,
    initialZoom,
    originalUrl,
    processedUrl,
    downloadUrl,
    cutoutUrl,
  } = props;

  const router = useRouter();
  const [mode, setMode] = useState<"view" | "edit">("view");
  const [rotateDeg, setRotateDeg] = useState(initialRotate);
  const [offsetX, setOffsetX] = useState(initialOffsetX);
  const [offsetY, setOffsetY] = useState(initialOffsetY);
  const [zoom, setZoom] = useState(initialZoom);

  const [cutoutImg, setCutoutImg] = useState<HTMLImageElement | null>(null);
  const [bgImg, setBgImg] = useState<HTMLImageElement | null>(null);
  const [loadingAssets, setLoadingAssets] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Load cutout + background once we enter edit mode.
  useEffect(() => {
    if (mode !== "edit" || !cutoutUrl) return;
    if (cutoutImg && bgImg) return;
    let cancelled = false;
    setLoadingAssets(true);
    Promise.all([loadImage(cutoutUrl, true), loadImage(SHOWROOM_URL)])
      .then(([c, b]) => {
        if (cancelled) return;
        setCutoutImg(c);
        setBgImg(b);
        setLoadingAssets(false);
      })
      .catch((err) => {
        if (cancelled) return;
        setSaveError(err instanceof Error ? err.message : String(err));
        setLoadingAssets(false);
      });
    return () => {
      cancelled = true;
    };
  }, [mode, cutoutUrl, cutoutImg, bgImg]);

  // Re-compose canvas whenever inputs change.
  useEffect(() => {
    if (mode !== "edit") return;
    if (!cutoutImg || !bgImg || !canvasRef.current) return;
    compose(canvasRef.current, cutoutImg, bgImg, rotateDeg, offsetX, offsetY, zoom);
  }, [mode, cutoutImg, bgImg, rotateDeg, offsetX, offsetY, zoom]);

  const handleEnterEdit = useCallback(() => {
    setSaveError(null);
    setMode("edit");
  }, []);

  const handleCancel = useCallback(() => {
    setRotateDeg(initialRotate);
    setOffsetX(initialOffsetX);
    setOffsetY(initialOffsetY);
    setZoom(initialZoom);
    setMode("view");
  }, [initialRotate, initialOffsetX, initialOffsetY, initialZoom]);

  const handleReset = useCallback(() => {
    setRotateDeg(0);
    setOffsetX(0);
    setOffsetY(0);
    setZoom(1);
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setSaveError(null);
    try {
      await editImage(imageId, rotateDeg, offsetX, offsetY, zoom);
      setMode("view");
      router.refresh();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : String(err));
    } finally {
      setSaving(false);
    }
  }, [imageId, rotateDeg, offsetX, offsetY, zoom, router]);

  // ─── EDIT MODE ────────────────────────────────────────────────────────────
  if (mode === "edit") {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight text-foreground">
              Szerkesztés
            </h2>
            <p className="text-xs text-muted-foreground">
              Állítsd be a forgatást és a pozíciót.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCancel}
              disabled={saving}
              className="rounded-full px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
            >
              Mégsem
            </button>
            <Button onClick={handleSave} disabled={saving || loadingAssets}>
              {saving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Mentés
                </>
              ) : (
                "Mentés"
              )}
            </Button>
          </div>
        </div>

        {saveError && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-700 shadow-soft">
            {saveError}
          </div>
        )}

        <div className="flex min-h-[320px] items-center justify-center overflow-hidden rounded-3xl border border-border/70 bg-gradient-to-br from-secondary to-accent/40 shadow-soft">
          {loadingAssets ? (
            <Loader2 className="size-8 animate-spin text-brand" />
          ) : (
            <canvas
              ref={canvasRef}
              className="h-auto max-h-[600px] w-auto max-w-full"
            />
          )}
        </div>

        <div className="grid gap-6 rounded-3xl border border-border/70 bg-white p-6 shadow-soft sm:grid-cols-2 lg:grid-cols-4">
          <SliderField
            label="Forgatás"
            value={rotateDeg}
            min={-10}
            max={10}
            step={0.5}
            unit="°"
            onChange={setRotateDeg}
          />
          <SliderField
            label="Nagyítás"
            value={zoom}
            min={0.5}
            max={2}
            step={0.05}
            unit="x"
            showSign={false}
            decimals={2}
            onChange={setZoom}
          />
          <SliderField
            label="Vízszintes (X)"
            value={offsetX}
            min={-50}
            max={50}
            step={1}
            unit="%"
            onChange={setOffsetX}
          />
          <SliderField
            label="Függőleges (Y)"
            value={offsetY}
            min={-50}
            max={50}
            step={1}
            unit="%"
            onChange={setOffsetY}
          />
        </div>

        <div className="flex flex-col items-start justify-between gap-2 text-sm md:flex-row md:items-center">
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            <RotateCcw className="size-3.5" />
            Alaphelyzet (0°, középre)
          </button>
          <p className="text-xs text-muted-foreground">
            Az előnézet kliensoldali — a mentésnél a szerver azonos képletet
            alkalmaz, az eredmény pixel-pontos.
          </p>
        </div>
      </div>
    );
  }

  // ─── VIEW MODE ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      {status === "DONE" && cutoutUrl && (
        <BackgroundPicker
          imageId={imageId}
          currentBgType={backgroundType}
          availableCustomKey={availableCustomKey}
        />
      )}
      <div className="grid gap-6 md:grid-cols-2">
      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Eredeti
        </h2>
        <div className="overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft">
          {originalUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={originalUrl}
              alt="Eredeti kép"
              className="w-full object-contain"
            />
          ) : (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
              Nincs eredeti kép
            </div>
          )}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand">
          Eredmény
        </h2>
        {status === "DONE" && processedUrl ? (
          <div className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-3xl border border-border/70 bg-white shadow-soft">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={processedUrl}
                alt="Feldolgozott kép"
                className="w-full object-contain"
              />
            </div>
            <div className="flex items-center gap-3">
              <a
                href={downloadUrl ?? processedUrl}
                download={`${projectName}.jpg`}
                className={cn(buttonVariants())}
              >
                <Download className="size-4" />
                Letöltés
              </a>
              {cutoutUrl && (
                <button
                  type="button"
                  onClick={handleEnterEdit}
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  <Pencil className="size-4" />
                  Szerkesztés
                </button>
              )}
              <DeleteProjectDialog
                projectId={projectId}
                projectName={projectName}
                createdAt={projectCreatedAt}
                onDeleted={() => router.push("/dashboard/galeria")}
                trigger={
                  <button
                    type="button"
                    className={cn(
                      buttonVariants({ variant: "outline" }),
                      "text-rose-600 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700",
                    )}
                  >
                    <Trash2 className="size-4" />
                    Törlés
                  </button>
                }
              />
            </div>
          </div>
        ) : status === "PROCESSING" || status === "PENDING" ? (
          <div className="flex h-64 flex-col items-center justify-center gap-3 rounded-3xl border border-border/70 bg-gradient-to-br from-secondary to-accent/40 shadow-soft">
            <Loader2 className="size-8 animate-spin text-brand" />
            <span className="text-sm font-medium text-foreground">
              Feldolgozás folyamatban...
            </span>
            <span className="text-xs text-muted-foreground">
              2-5 másodperc, frissül magától
            </span>
          </div>
        ) : status === "FAILED" ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 px-5 py-6 text-sm text-rose-700 shadow-soft">
            <p className="mb-2 font-medium">A feldolgozás nem sikerült.</p>
            {errorMessage && (
              <p className="mb-3 text-rose-600">{errorMessage}</p>
            )}
            <Link
              href="/dashboard/new"
              className="underline underline-offset-2 hover:no-underline"
            >
              Új képet indítok
            </Link>
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-3xl border border-border/70 bg-white text-muted-foreground shadow-soft">
            Nincs kép
          </div>
        )}
      </section>
      </div>
    </div>
  );
}

function SliderField({
  label,
  value,
  min,
  max,
  step,
  unit,
  showSign = true,
  decimals,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit: string;
  showSign?: boolean;
  decimals?: number;
  onChange: (v: number) => void;
}) {
  const fractionDigits = decimals ?? (step >= 1 ? 0 : 1);
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <label className="font-medium text-foreground">{label}</label>
        <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
          {showSign && value > 0 ? "+" : ""}
          {value.toFixed(fractionDigits)}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full accent-indigo-600"
      />
    </div>
  );
}
