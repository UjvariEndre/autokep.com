import Link from "next/link";
import { format } from "date-fns";
import { hu, enUS } from "date-fns/locale";
import { ArrowRight, CheckCircle2, Coins, CreditCard, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/server/users";
import { getI18n } from "@/i18n/locale";
import type { Dictionary } from "@/i18n/dictionaries";
import type { Locale } from "@/i18n/config";
import {
  createSubscriptionCheckout,
  openCustomerPortal,
} from "@/server/actions/billing";

export const dynamic = "force-dynamic";

function fmt(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

function formatDate(d: Date | null | undefined, locale: Locale, noDate: string): string {
  if (!d) return noDate;
  return format(d, locale === "hu" ? "yyyy. MMMM d." : "MMMM d, yyyy", {
    locale: locale === "hu" ? hu : enUS,
  });
}

function formatHuf(n: number, locale: Locale): string {
  return `${n.toLocaleString(locale === "hu" ? "hu-HU" : "en-US")} Ft`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const user = await getOrCreateUser();
  const { locale, dict } = await getI18n();
  const t = dict.billing;
  const payments = await prisma.payment.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
    take: 20,
  });

  const now = new Date();
  const isActive = user.subscriptionStatus === "active";
  const isCanceledButValid =
    user.subscriptionStatus === "canceled" &&
    user.subscriptionPeriodEnd != null &&
    user.subscriptionPeriodEnd > now;
  const isPastDue = user.subscriptionStatus === "past_due";

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">{t.title}</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        {t.subtitle}
      </p>

      {params.success === "subscription" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-soft">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">{t.successSubscriptionTitle}</p>
            <p className="mt-0.5">{t.successSubscriptionBody}</p>
          </div>
        </div>
      )}
      {params.success === "topup" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-soft">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">{t.successTopupTitle}</p>
            <p className="mt-0.5">{t.successTopupBody}</p>
          </div>
        </div>
      )}

      {/* Plan summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4 text-brand" />
            {t.subscription}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isActive && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-100 text-emerald-700">{t.active}</Badge>
                <span className="text-sm text-muted-foreground">
                  {fmt(t.nextRenewal, { date: formatDate(user.subscriptionPeriodEnd, locale, t.noDate) })}
                </span>
              </div>
              <CreditBreakdown
                t={t}
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <form action={openCustomerPortal}>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  {t.manageSubscription}
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </>
          )}

          {isCanceledButValid && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-amber-100 text-amber-800">{t.canceled}</Badge>
                <span className="text-sm text-muted-foreground">
                  {fmt(t.usableUntil, { date: formatDate(user.subscriptionPeriodEnd, locale, t.noDate) })}
                </span>
              </div>
              <CreditBreakdown
                t={t}
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <form action={createSubscriptionCheckout}>
                <button type="submit" className={cn(buttonVariants())}>
                  {t.resubscribe}
                </button>
              </form>
            </>
          )}

          {isPastDue && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="destructive">{t.pastDue}</Badge>
                <span className="text-sm text-muted-foreground">
                  {t.pastDueNote}
                </span>
              </div>
              <CreditBreakdown
                t={t}
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <form action={openCustomerPortal}>
                <button type="submit" className={cn(buttonVariants())}>
                  {t.updatePayment}
                </button>
              </form>
            </>
          )}

          {!isActive && !isCanceledButValid && !isPastDue && (
            <>
              <p className="text-sm text-muted-foreground">
                {t.noSubscriptionPrefix}{user.subscriptionCredits > 0 ? (
                  <>{t.freeCreditsPrefix}<span className="font-medium text-foreground">{fmt(t.freeCreditsAmount, { count: user.subscriptionCredits })}</span>{t.freeCreditsSuffix}</>
                ) : null}
              </p>
              <CreditBreakdown
                t={t}
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <Link href="/pricing" className={cn(buttonVariants())}>
                {t.subscribeNow}
                <ArrowRight className="size-4" />
              </Link>
            </>
          )}
        </CardContent>
      </Card>

      {/* Top-up CTA */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Coins className="size-4 text-brand" />
            {t.topupTitle}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">{t.balance}</span>
            <span className="font-medium text-foreground">{fmt(t.balanceCredits, { count: user.topupCredits })}</span>
            <p className="mt-1 text-xs text-muted-foreground">{t.neverExpires}</p>
          </div>
          <Link
            href="/dashboard/topup"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Plus className="size-4" />
            {t.buyCredit}
          </Link>
        </CardContent>
      </Card>

      {/* Payment history */}
      <h2 className="mt-10 mb-4 text-xl font-semibold tracking-tight">{t.purchases}</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t.noPurchases}</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">{t.colDate}</th>
                <th className="px-4 py-3">{t.colType}</th>
                <th className="px-4 py-3 text-right">{t.colAmount}</th>
                <th className="px-4 py-3 text-right">{t.colCredit}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-foreground">
                    {formatDate(p.createdAt, locale, t.noDate)}
                  </td>
                  <td className="px-4 py-3">
                    {p.type === "subscription" ? t.typeSubscription : t.typeTopup}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatHuf(p.amountHuf, locale)}
                  </td>
                  <td className="px-4 py-3 text-right text-muted-foreground">
                    +{p.creditsAdded}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CreditBreakdown({
  t,
  sub,
  topup,
}: {
  t: Dictionary["billing"];
  sub: number;
  topup: number;
}) {
  const total = sub + topup;
  return (
    <div className="rounded-xl bg-accent/40 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">{fmt(t.creditsTotal, { count: total })}</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {fmt(t.creditsBreakdown, { sub, topup })}
      </p>
    </div>
  );
}
