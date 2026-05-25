"use server";

import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { isTheme, type Theme } from "@/i18n/config";

/**
 * Persist the signed-in user's theme preference to the DB so it follows them
 * across devices. Only the signed-in area uses it; public pages stay light.
 */
export async function setTheme(theme: Theme) {
  if (!isTheme(theme)) return;
  const { userId } = await auth();
  if (!userId) return;
  await prisma.user
    .update({ where: { clerkId: userId }, data: { theme } })
    .catch(() => {});
}
