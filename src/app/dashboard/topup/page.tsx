import Link from "next/link";
import { ArrowLeft, Check, X, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TOPUP_PRICE_LABELS } from "@/lib/stripe";
import { createTopupCheckout } from "@/server/actions/billing";
import { getI18n } from "@/i18n/locale";

export const dynamic = "force-dynamic";

export default async function TopupPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const params = await searchParams;
  const canceled = params.canceled === "1";
  const { locale, dict } = await getI18n();
  const t = dict.topup;
  const nf = (n: number) => n.toLocaleString(locale === "hu" ? "hu-HU" : "en-US");

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/billing"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        {t.back}
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        {t.title}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.subtitle}
      </p>

      {canceled && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-soft">
          <X className="mt-0.5 size-4 shrink-0" />
          <p>{t.canceled}</p>
        </div>
      )}

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        {TOPUP_PRICE_LABELS.map(({ priceId, credits, huf }) => {
          const perImage = Math.round(huf / credits);
          const isFeatured = credits === 25;
          const action = createTopupCheckout.bind(null, priceId);

          return (
            <Card
              key={priceId}
              className={cn(
                "transition-all hover:-translate-y-1 hover:shadow-soft-lg",
                isFeatured && "border-brand/40 ring-1 ring-brand/20",
              )}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{t.creditsLabel.replace("{credits}", String(credits))}</span>
                  {isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      <Zap className="size-3" /> {t.recommended}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight">
                      {nf(huf)}
                    </span>
                    <span className="text-sm text-muted-foreground">{t.currency}</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t.perImage.replace("{price}", nf(perImage))}
                  </p>
                </div>

                <ul className="space-y-2">
                  {t.perks.map((perk) => (
                    <li
                      key={perk}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="flex size-4 items-center justify-center rounded-full bg-brand/10 text-brand">
                        <Check className="size-2.5" />
                      </span>
                      {perk}
                    </li>
                  ))}
                </ul>

                <form action={action}>
                  <button
                    type="submit"
                    className={cn(
                      buttonVariants({
                        variant: isFeatured ? "default" : "outline",
                      }),
                      "w-full",
                    )}
                  >
                    {t.buy}
                  </button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        {t.paymentNote}
      </p>
    </div>
  );
}
