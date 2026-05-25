import "server-only";
import hu from "./hu.json";
import en from "./en.json";
import type { Locale } from "./config";

// The Hungarian dictionary is the source of truth for the shape; `en` must
// match it structurally or this assignment fails to type-check.
export type Dictionary = typeof hu;

const dictionaries: Record<Locale, Dictionary> = { hu, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}
