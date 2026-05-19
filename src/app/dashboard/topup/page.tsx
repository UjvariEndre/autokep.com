import Link from "next/link";
import { ArrowLeft, Check, X, Zap } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { TOPUP_PRICE_LABELS } from "@/lib/stripe";
import { createTopupCheckout } from "@/server/actions/billing";

export const dynamic = "force-dynamic";

const PACK_PERKS = [
  "Sosem jár le",
  "Bármikor felhasználható",
  "Előfizetés mellé is jó",
];

export default async function TopupPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const params = await searchParams;
  const canceled = params.canceled === "1";

  return (
    <div className="mx-auto max-w-4xl">
      <Link
        href="/dashboard/billing"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Vissza a számlázáshoz
      </Link>

      <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">
        Top-up kredit vásárlása
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Egyszeri vásárlás, sosem jár le. Válassz csomagot.
      </p>

      {canceled && (
        <div className="mt-6 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-soft">
          <X className="mt-0.5 size-4 shrink-0" />
          <p>A vásárlás megszakítva.</p>
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
                  <span>{credits} kredit</span>
                  {isFeatured && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-brand/10 px-2 py-0.5 text-[11px] font-medium text-brand">
                      <Zap className="size-3" /> Ajánlott
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-5">
                <div>
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight">
                      {huf.toLocaleString("hu-HU")}
                    </span>
                    <span className="text-sm text-muted-foreground">Ft</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {perImage.toLocaleString("hu-HU")} Ft / kép
                  </p>
                </div>

                <ul className="space-y-2">
                  {PACK_PERKS.map((perk) => (
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
                    Vásárlás
                  </button>
                </form>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <p className="mt-10 text-center text-xs text-muted-foreground">
        Stripe biztonságos fizetés · Bankkártya, Apple Pay, Google Pay
      </p>
    </div>
  );
}
