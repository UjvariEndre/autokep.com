"use server";

import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import {
  isLocale,
  LOCALE_COOKIE,
  LOCALE_COOKIE_MAX_AGE,
  type Locale,
} from "@/i18n/config";

/**
 * Persist the user's language choice.
 *
 * Always writes the `locale` cookie (so it works for signed-out visitors and
 * applies immediately). For signed-in users it also saves the preference to
 * the DB so it follows them across devices.
 */
export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) return;

  const store = await cookies();
  store.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: LOCALE_COOKIE_MAX_AGE,
    sameSite: "lax",
  });

  const { userId } = await auth();
  if (userId) {
    // User row may not exist yet (brand-new sign-up); ignore in that case —
    // the cookie covers it until getOrCreateUser runs.
    await prisma.user
      .update({ where: { clerkId: userId }, data: { locale } })
      .catch(() => {});
  }
}
