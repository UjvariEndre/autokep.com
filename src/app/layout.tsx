import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { huHU, enUS } from "@clerk/localizations";
import { Inter, Space_Grotesk, JetBrains_Mono } from "next/font/google";
import { SupportChat } from "@/components/support-chat";
import { getI18n } from "@/i18n/locale";
import { I18nProvider } from "@/i18n/provider";
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
  const { dict } = await getI18n();
  return {
    title: "autokep.com",
    description: dict.landing.hero.badge,
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const { locale, dict } = await getI18n();

  return (
    <ClerkProvider localization={locale === "hu" ? huHU : enUS}>
      <html
        lang={locale}
        className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      >
        <body className="min-h-full flex flex-col font-sans">
          <I18nProvider locale={locale} dict={dict}>
            {children}
            <SupportChat />
          </I18nProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
