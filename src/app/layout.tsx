import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { huHU, enUS } from "@clerk/localizations";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SupportChat } from "@/components/support-chat";
import { getI18n } from "@/i18n/locale";
import { I18nProvider } from "@/i18n/provider";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-heading",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin", "latin-ext"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { locale, dict } = await getI18n();
  const seo = dict.seo;
  return {
    metadataBase: new URL(SITE_URL),
    title: { default: seo.title, template: seo.titleTemplate },
    description: seo.description,
    keywords: seo.keywords,
    applicationName: SITE_NAME,
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title: seo.title,
      description: seo.description,
      locale: locale === "hu" ? "hu_HU" : "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: seo.title,
      description: seo.description,
    },
    robots: { index: true, follow: true },
    // Optional: set GOOGLE_SITE_VERIFICATION in prod for the Search Console
    // HTML-tag verification method (skip if you verified via DNS).
    verification: process.env.GOOGLE_SITE_VERIFICATION
      ? { google: process.env.GOOGLE_SITE_VERIFICATION }
      : undefined,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dict } = await getI18n();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        email: "hello@autokep.com",
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: dict.seo.description,
        inLanguage: locale === "hu" ? "hu-HU" : "en-US",
        publisher: { "@id": `${SITE_URL}/#organization` },
      },
    ],
  };

  return (
    <ClerkProvider localization={locale === "hu" ? huHU : enUS}>
      <html
        lang={locale}
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col font-sans">
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
          />
          <I18nProvider locale={locale} dict={dict}>
            {children}
            <SupportChat />
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
