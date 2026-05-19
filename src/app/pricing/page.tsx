import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { ArrowRight, Car, Check, Sparkles, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TOPUP_PRICE_LABELS } from "@/lib/stripe";
import { createSubscriptionCheckout } from "@/server/actions/billing";

export const dynamic = "force-dynamic";

const SUBSCRIPTION_FEATURES = [
  "50 kép minden hónapban",
  "Showroom stúdió hátterek",
  "Saját háttér feltöltés",
  "Egy kattintással letöltés",
  "Bármikor lemondható",
];

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<{ canceled?: string }>;
}) {
  const params = await searchParams;
  const canceled = params.canceled === "1";
  const { userId } = await auth();
  const isAuthed = Boolean(userId);

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav isAuthed={isAuthed} />

      <main className="mx-auto max-w-5xl px-6 pb-24 pt-16 md:pt-20">
        {canceled && (
          <div className="mb-8 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-800 shadow-soft">
            <X className="mt-0.5 size-4 shrink-0" />
            <p>A vásárlás megszakítva. Bármikor visszatérhetsz, ha készen állsz.</p>
          </div>
        )}

        <div className="mb-14 text-center">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft">
            <Sparkles className="size-3.5 text-brand" />
            Egyszerű, átlátható árazás
          </div>
          <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
            Egyszerű árazás, <span className="text-brand">profi képek</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-muted-foreground md:text-lg">
            Havi előfizetés a rendszeres munkához, vagy egyszeri top-up kreditek, ha csak alkalmanként kell.
          </p>
        </div>

        {/* Subscription card */}
        <div className="mb-16">
          <div className="relative overflow-hidden rounded-3xl border border-brand/30 bg-gradient-to-br from-accent/40 via-white to-white p-8 shadow-soft-lg md:p-10">
            <div className="absolute -right-16 -top-16 size-56 rounded-full bg-brand/10 blur-3xl" />
            <div className="relative grid items-start gap-10 md:grid-cols-[1.4fr_1fr]">
              <div>
                <span className="inline-flex items-center rounded-full bg-brand px-3 py-1 text-xs font-medium text-white shadow-soft">
                  Legnépszerűbb
                </span>
                <h2 className="mt-4 text-2xl font-semibold tracking-tight md:text-3xl">
                  Előfizetés
                </h2>
                <p className="mt-2 max-w-md text-sm text-muted-foreground">
                  Aktív kereskedőknek, akik rendszeresen készítenek új hirdetéseket.
                </p>
                <ul className="mt-6 space-y-2.5">
                  {SUBSCRIPTION_FEATURES.map((f) => (
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
                      9 780
                    </span>
                    <span className="text-base text-muted-foreground">Ft / hó</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Havonta megújul · 50 kép / hónap
                  </p>
                </div>

                {isAuthed ? (
                  <form action={createSubscriptionCheckout}>
                    <button
                      type="submit"
                      className={cn(buttonVariants({ size: "lg" }), "w-full")}
                    >
                      Feliratkozom
                      <ArrowRight className="size-4" />
                    </button>
                  </form>
                ) : (
                  <Link
                    href="/sign-up?redirect_url=/pricing"
                    className={cn(buttonVariants({ size: "lg" }), "w-full")}
                  >
                    Feliratkozom
                    <ArrowRight className="size-4" />
                  </Link>
                )}

                <p className="text-center text-[11px] text-muted-foreground">
                  Lemondás bármikor a fiókodban
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Top-up section */}
        <div>
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
              Több kép kell? Vegyél extra kreditet
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Egyszeri vásárlás, sosem jár le. Ideális kiegészítő az előfizetés mellé.
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
                    {credits} kredit
                  </h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-semibold tracking-tight">
                      {huf.toLocaleString("hu-HU")}
                    </span>
                    <span className="text-sm text-muted-foreground">Ft</span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {perImage.toLocaleString("hu-HU")} Ft / kép · Sosem jár le
                  </p>

                  {isAuthed ? (
                    <Link
                      href="/dashboard/topup"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "default" }),
                        "mt-5 w-full",
                      )}
                    >
                      Vásárlás
                    </Link>
                  ) : (
                    <Link
                      href="/sign-up?redirect_url=/dashboard/topup"
                      className={cn(
                        buttonVariants({ variant: "outline", size: "default" }),
                        "mt-5 w-full",
                      )}
                    >
                      Vásárlás
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <p className="mx-auto mt-16 max-w-xl text-center text-xs text-muted-foreground">
          Az árak forintban értendők, ÁFA-mentesek (alanyi adómentes vállalkozás).
          Lemondás bármikor a felhasználói fiókban. Visszatérítést nem áll módunkban nyújtani.
        </p>
      </main>
    </div>
  );
}

function SiteNav({ isAuthed }: { isAuthed: boolean }) {
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
            Főoldal
          </Link>
          <Link href="/pricing" className="text-foreground transition-colors">
            Árak
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {isAuthed ? (
            <Link href="/dashboard" className={cn(buttonVariants({ size: "sm" }))}>
              Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/sign-in"
                className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
              >
                Bejelentkezés
              </Link>
              <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
                Próbáld ki
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
