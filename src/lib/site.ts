// Canonical production origin used for SEO metadata, robots.txt and sitemap.
//
// We deliberately only trust NEXT_PUBLIC_APP_URL when it's an https URL so that
// a dev/preview value like http://localhost:3000 never leaks into canonical /
// Open Graph URLs or the sitemap — those must always point at production.
const envUrl = process.env.NEXT_PUBLIC_APP_URL;
export const SITE_URL =
  envUrl && envUrl.startsWith("https://")
    ? envUrl.replace(/\/$/, "")
    : "https://www.autokep.com";

export const SITE_NAME = "Autókép";
