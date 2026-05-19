import Link from "next/link";
import { format } from "date-fns";
import { hu } from "date-fns/locale";
import { ArrowRight, CheckCircle2, Coins, CreditCard, Plus } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/server/users";
import {
  createSubscriptionCheckout,
  openCustomerPortal,
} from "@/server/actions/billing";

export const dynamic = "force-dynamic";

function formatHuDate(d: Date | null | undefined): string {
  if (!d) return "—";
  return format(d, "yyyy. MMMM d.", { locale: hu });
}

function formatHuf(n: number): string {
  return `${n.toLocaleString("hu-HU")} Ft`;
}

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string }>;
}) {
  const params = await searchParams;
  const user = await getOrCreateUser();
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
      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Számlázás</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Az előfizetésed és a vásárlásaid áttekintése.
      </p>

      {params.success === "subscription" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-soft">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Sikeres előfizetés!</p>
            <p className="mt-0.5">50 kredit hozzáadva a fiókodhoz.</p>
          </div>
        </div>
      )}
      {params.success === "topup" && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800 shadow-soft">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <div>
            <p className="font-medium">Sikeres top-up vásárlás!</p>
            <p className="mt-0.5">A kreditek elérhetők a fiókodban.</p>
          </div>
        </div>
      )}

      {/* Plan summary */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="size-4 text-brand" />
            Előfizetés
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          {isActive && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-emerald-100 text-emerald-700">Aktív</Badge>
                <span className="text-sm text-muted-foreground">
                  Következő megújulás: {formatHuDate(user.subscriptionPeriodEnd)}
                </span>
              </div>
              <CreditBreakdown
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <form action={openCustomerPortal}>
                <button
                  type="submit"
                  className={cn(buttonVariants({ variant: "outline" }))}
                >
                  Előfizetés kezelése
                  <ArrowRight className="size-4" />
                </button>
              </form>
            </>
          )}

          {isCanceledButValid && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge className="bg-amber-100 text-amber-800">Lemondva</Badge>
                <span className="text-sm text-muted-foreground">
                  {formatHuDate(user.subscriptionPeriodEnd)}-ig használhatod
                </span>
              </div>
              <CreditBreakdown
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <form action={createSubscriptionCheckout}>
                <button type="submit" className={cn(buttonVariants())}>
                  Újra előfizetek
                </button>
              </form>
            </>
          )}

          {isPastDue && (
            <>
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="destructive">Sikertelen fizetés</Badge>
                <span className="text-sm text-muted-foreground">
                  Frissítsd a bankkártya adatokat a folytatáshoz.
                </span>
              </div>
              <CreditBreakdown
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <form action={openCustomerPortal}>
                <button type="submit" className={cn(buttonVariants())}>
                  Fizetési mód frissítése
                </button>
              </form>
            </>
          )}

          {!isActive && !isCanceledButValid && !isPastDue && (
            <>
              <p className="text-sm text-muted-foreground">
                Még nem fizettél elő. {user.subscriptionCredits > 0 ? (
                  <>Jelenleg <span className="font-medium text-foreground">{user.subscriptionCredits} ingyenes kredit</span> áll rendelkezésedre.</>
                ) : null}
              </p>
              <CreditBreakdown
                sub={user.subscriptionCredits}
                topup={user.topupCredits}
              />
              <Link href="/pricing" className={cn(buttonVariants())}>
                Előfizetek
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
            Top-up kreditek
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-4">
          <div className="text-sm">
            <span className="text-muted-foreground">Egyenleg: </span>
            <span className="font-medium text-foreground">{user.topupCredits} kredit</span>
            <p className="mt-1 text-xs text-muted-foreground">Sosem jár le.</p>
          </div>
          <Link
            href="/dashboard/topup"
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            <Plus className="size-4" />
            Kredit vásárlása
          </Link>
        </CardContent>
      </Card>

      {/* Payment history */}
      <h2 className="mt-10 mb-4 text-xl font-semibold tracking-tight">Vásárlások</h2>
      {payments.length === 0 ? (
        <p className="text-sm text-muted-foreground">Még nincs vásárlásod.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-white shadow-soft">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Dátum</th>
                <th className="px-4 py-3">Típus</th>
                <th className="px-4 py-3 text-right">Összeg</th>
                <th className="px-4 py-3 text-right">Kredit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/70">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-4 py-3 text-foreground">
                    {formatHuDate(p.createdAt)}
                  </td>
                  <td className="px-4 py-3">
                    {p.type === "subscription" ? "Előfizetés" : "Top-up"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-foreground">
                    {formatHuf(p.amountHuf)}
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

function CreditBreakdown({ sub, topup }: { sub: number; topup: number }) {
  const total = sub + topup;
  return (
    <div className="rounded-xl bg-accent/40 px-4 py-3 text-sm">
      <p className="font-medium text-foreground">{total} kredit</p>
      <p className="mt-0.5 text-xs text-muted-foreground">
        {sub} havi · {topup} top-up
      </p>
    </div>
  );
}
