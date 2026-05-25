import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Car, Check, Sparkles, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { LanguageToggle } from "@/components/language-toggle";
import { TOPUP_PRICE_LABELS } from "@/lib/stripe";
import { createSubscriptionCheckout } from "@/server/actions/billing";
import { getI18n } from "@/i18n/locale";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { dict } = await getI18n();
  return {
    title: dict.seo.pricingTitle,
    description: dict.seo.pricingDescription,
    alternates: { canonical: "/pricing" },
    openGraph: {
      title: dict.seo.pricingTitle,
      description: dict.seo.pricingDescription,
      url: "/pricing",
    },
  };
}

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const params = await searchParams;
  const canceled = params.canceled === "1";
  const { userId } = await auth();
  const isAuthed = Boolean(userId);
  const { locale, dict } = await getI18n();
  const t = dict.pricing;
  const nf = (n: number) => n.toLocaleString(locale === "hu" ? "hu-HU" : "en-US");

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav isAuthed={isAuthed} t={t} common={dict.common} />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 md:pt-20">
        {canceled && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-soft">
            <X className="mt-0.5 size-4 shrink-0" />
            <p>{t.canceled}</p>
          </div>
        )}

        <div className="mb-14 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="size-3.5 text-brand" />
            {t.badge}
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            {t.titlePrefix}
            <span className="text-brand">{t.titleHighlight}</span>
            {t.titleSuffix}
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            {t.subtitle}
          </p>
        </div>

        {/* Subscription card */}
        <div className="mb-16">
          <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-accent/40 via-white to-white p-8 shadow-soft-lg md:p-10">
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-brand/10 blur-3xl" />
            <div className="relative grid items-start gap-10 md:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-medium text-white shadow-soft">
                  {t.mostPopular}
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                  {t.subscription}
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  {t.subscriptionTagline}
                </p>
                <ul className="mt-6 space-y-2.5">
                  {t.subscriptionFeatures.map((f) => (
                    <li key={f} className="flex items-center gap-2.5 text-sm text-foreground">
                      <span className="flex size-5 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <Check className="size-3" />
                      </span>
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-white p-6 shadow-soft">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight md:text-5xl">
                      {nf(9780)}
                    </span>
                    <span className="text-base text-muted-foreground">{t.perMonth}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.renewNote}
                  </p>
                </div>

                {isAuthed ? (
                  <form action={createSubscriptionCheckout}>
                    <button
                      type="submit"
                      className={cn(buttonVariants({ size: "lg" }), "w-full")}
                    >
                      {t.subscribe}
                      <ArrowRight className="size-4" />
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/sign-up?redirect_url=/pricing"
                    className={cn(buttonVariants({ size: "lg" }), "w-full")}
                  >
                    {t.subscribe}
                    <ArrowRight className="size-4" />
                  </Link>
                )}

                <p className="text-center text-[11px] text-muted-foreground">
                  {t.cancelAnytime}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top-up section */}
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              {t.topupTitle}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {t.topupSubtitle}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {TOPUP_PRICE_LABELS.map(({ priceId, credits, huf }) => {
              const perImage = Math.round(huf / credits);
              return (
                <div
                  key={priceId}
                  className="flex flex-col rounded-2xl border border-border/70 bg-white p-6 shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg"
                >
                  <h3 className="text-lg font-semibold tracking-tight">
                    {t.creditsLabel.replace("{credits}", String(credits))}
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight">
                      {nf(huf)}
                    </span>
                    <span className="text-sm text-muted-foreground">{t.currency}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.perImageNeverExpires.replace("{price}", nf(perImage))}
                  </p>

                  {isAuthed ? (
                    <Link
                      href="/dashboard/topup"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "default" }),
                        "mt-5 w-full",
                      )}
                    >
                      {dict.common.buy}
                    </Link>
                  ) : (
                    <Link
                      href="/sign-up?redirect_url=/dashboard/topup"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "default" }),
                        "mt-5 w-full",
                      )}
                    >
                      {dict.common.buy}
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="mx-auto mt-16 max-w-xl text-center text-xs text-muted-foreground">
          {t.fineprint}
        </p>
      </main>
    </div>
  );
}

function SiteNav({
  isAuthed,
  t,
  common,
}: {
  isAuthed: boolean;
  t: Dictionary["pricing"];
  common: Dictionary["common"];
}) {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-brand shadow-soft">
            <Car className="size-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Autókép<span className="text-brand">.</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-7 text-sm text-muted-foreground md:flex">
          <Link href="/" className="transition-colors hover:text-foreground">
            {t.nav.home}
          </Link>
          <Link href="/pricing" className="text-foreground transition-colors">
            {t.nav.pricing}
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          {isAuthed ? (
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              {common.dashboard}
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                {common.login}
              </Link>
              <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
                {common.signup}
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
