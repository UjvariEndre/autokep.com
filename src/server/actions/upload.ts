"use server";

import { randomUUID } from "node:crypto";
import { getPresignedUploadUrl } from "@/lib/r2";
import { getOrCreateUser } from "@/server/users";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function sanitizeFilename(name: string): string {
  // Keep last segment only (defend against path tricks)
  const base = name.split(/[\\/]/).pop() ?? "image";
  // Allow alnum, dot, dash, underscore; replace everything else
  const cleaned = base.replace(/[^a-zA-Z0-9._-]/g, "_");
  // Cap length to keep keys reasonable
  return cleaned.slice(0, 80) || "image";
}

export async function getUploadUrl(
  filename: string,
  contentType: string,
): Promise<{ url: string; key: string }> {
  if (!ALLOWED_TYPES.has(contentType)) {
    throw new Error(
      "Csak JPG, PNG vagy WebP képet tölthetsz fel.",
    );
  }
  const user = await getOrCreateUser();
  const safeName = sanitizeFilename(filename);
  const key = `originals/${user.id}/${randomUUID()}-${safeName}`;
  const url = await getPresignedUploadUrl(key, contentType, 300);
  return { url, key };
}
