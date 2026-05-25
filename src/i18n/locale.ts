import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { defaultLocale, isLocale, LOCALE_COOKIE, type Locale } from "./config";
import { getDictionary, type Dictionary } from "./dictionaries";

/**
 * Resolve the active locale for the current request.
 *
 * Priority:
 *   1. Logged-in user's saved DB preference (follows them across devices).
 *   2. The `locale` cookie (set by middleware from IP on first visit, or by
 *      the language switcher).
 *   3. The default locale.
 *
 * Wrapped in React `cache` so repeated calls within one request hit the DB /
 * cookie store only once.
 */
export const getLocale = cache(async (): Promise<Locale> => {
  try {
    const { userId } = await auth();
    if (userId) {
      const user = await prisma.user.findUnique({
        where: { clerkId: userId },
        select: { locale: true },
      });
      if (isLocale(user?.locale)) return user.locale;
    }
  } catch {
    // auth()/prisma may be unavailable in some contexts — fall back to cookie.
  }

  const store = await cookies();
  const cookieValue = store.get(LOCALE_COOKIE)?.value;
  return isLocale(cookieValue) ? cookieValue : defaultLocale;
});

export const getI18n = cache(
  async (): Promise<{ locale: Locale; dict: Dictionary }> => {
    const locale = await getLocale();
    return { locale, dict: getDictionary(locale) };
  },
);
