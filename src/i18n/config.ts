// Shared, runtime-safe i18n constants. No server-only imports here so this
// module can be used from middleware (proxy.ts) and client components alike.

export const locales = ["hu", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "hu";

export const LOCALE_COOKIE = "locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "hu" || value === "en";
}

/**
 * IP-based default: Hungarian IP -> hu, everything else -> en.
 * `country` is the ISO-3166 alpha-2 code from the host's geo header.
 */
export function localeFromCountry(country: string | null | undefined): Locale {
  return (country ?? "").toUpperCase() === "HU" ? "hu" : "en";
}
