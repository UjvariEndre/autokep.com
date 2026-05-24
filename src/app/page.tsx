import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import {
  ArrowRight,
  Car,
  Sparkles,
  Wand2,
  Zap,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-white text-foreground">
      <SiteNav />
      <Hero />
      <BeforeAfter />
      <Features />
      <HowItWorks />
      <FinalCta />
      <SiteFooter />
    </div>
  );
}

function SiteNav() {
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
          <a href="#funkciok" className="transition-colors hover:text-foreground">
            Funkciók
          </a>
          <a href="#hogyan" className="transition-colors hover:text-foreground">
            Hogyan működik
          </a>
          <Link href="/pricing" className="transition-colors hover:text-foreground">
            Árak
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "hidden sm:inline-flex")}
          >
            Bejelentkezés
          </Link>
          <Link href="/sign-up" className={cn(buttonVariants({ size: "sm" }))}>
            Próbáld ki
          </Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="bg-mesh absolute inset-0 -z-10" />
      <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_75%)]" />

      <div className="mx-auto flex max-w-5xl flex-col items-center px-6 pt-20 pb-24 text-center md:pt-28 md:pb-32">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/70 bg-white/70 px-4 py-1.5 text-xs font-medium text-muted-foreground shadow-soft backdrop-blur">
          <Sparkles className="size-3.5 text-brand" />
          AI háttércsere autós fotókhoz
        </div>

        <h1 className="max-w-3xl text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-6xl lg:text-7xl">
          Stúdió-minőségű autós fotók{" "}
          <span className="text-brand">másodpercek</span> alatt
        </h1>

        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground md:text-xl">
          Töltsd fel a képet, az AI levágja a hátteret, mi pedig rárakjuk
          a professzionális showroom hátterünket. Kereskedőknek és magánszemélyeknek.
        </p>

        <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
          <Link
            href="/sign-up"
            className={cn(buttonVariants({ size: "lg" }), "min-w-[200px]")}
          >
            Próbáld ki ingyen
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }), "min-w-[200px]")}
          >
            Bejelentkezés
          </Link>
        </div>

        <p className="mt-6 text-sm text-muted-foreground">
          Ingyenes 3 kép havonta · Bankkártya nem szükséges · JPG, PNG, WebP
        </p>
      </div>
    </section>
  );
}

function BeforeAfter() {
  return (
    <section className="border-t border-border/60 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-12 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-brand">
            Élő példa
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Egy fotó. Két másodperc. Stúdió-háttér.
          </h2>
        </div>

        <div className="relative grid items-center gap-6 md:grid-cols-[1fr_auto_1fr]">
          <DemoCard
            label="Eredeti fotó"
            sublabel="Parkoló, utca, gyenge fény"
            tone="before"
            imageSrc="/images/landing/before.jpg"
          />
          <div className="hidden md:flex">
            <div className="flex size-12 items-center justify-center rounded-full bg-brand text-white shadow-soft-lg">
              <ArrowRight className="size-5" />
            </div>
          </div>
          <div className="flex justify-center md:hidden">
            <div className="flex size-10 items-center justify-center rounded-full bg-brand text-white shadow-soft">
              <ArrowRight className="size-4 rotate-90" />
            </div>
          </div>
          <DemoCard
            label="Eredmény"
            sublabel="Showroom háttérrel, AI-vágva"
            tone="after"
            imageSrc="/images/landing/after.jpg"
          />
        </div>
      </div>
    </section>
  );
}

function DemoCard({
  label,
  sublabel,
  imageSrc,
  tone,
}: {
  label: string;
  sublabel: string;
  imageSrc: string;
  tone: "before" | "after";
}) {
  const isAfter = tone === "after";
  return (
    <div className="flex flex-col gap-3">
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-3xl border border-border/70 bg-zinc-100 shadow-soft">
        <img
          src={imageSrc}
          alt={label}
          className="absolute inset-0 size-full object-cover"
        />
        <span
          className={cn(
            "absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-medium backdrop-blur",
            isAfter
              ? "bg-white/85 text-foreground shadow-soft"
              : "bg-black/55 text-white",
          )}
        >
          {isAfter ? "AI showroom" : "Eredeti"}
        </span>
      </div>
      <div className="px-1">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{sublabel}</p>
      </div>
    </div>
  );
}

const FEATURES = [
  {
    icon: Zap,
    title: "Másodpercek alatt",
    body:
      "A feldolgozás 2-5 másodperc. Nem kell várni, nem kell sorba állni — azonnal megkapod a kész képet.",
  },
  {
    icon: Wand2,
    title: "Autóra hangolt AI",
    body:
      "A remove.bg type=car modellt használjuk. A tükrök, antennák, kerekek élén is pontosan vág.",
  },
  {
    icon: Sparkles,
    title: "Magyar nyelven, magyaroknak",
    body:
      "Magyar UI, magyar ügyfélszolgálat, helyi kereskedőknek tervezve. Nincs angol setup-kör.",
  },
];

function Features() {
  return (
    <section id="funkciok" className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-12 max-w-2xl">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-brand">
            Miért Autókép?
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Tiszta, gyors, autó-specifikus.
          </h2>
          <p className="mt-4 text-base text-muted-foreground">
            Az általános háttéreltávolítók gyakran elrontják a tükröket vagy a kerekeket.
            Mi kifejezetten autókra fejlesztett modellt használunk.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="group relative rounded-2xl border border-border/70 bg-white p-7 shadow-soft transition-all hover:-translate-y-1 hover:shadow-soft-lg"
            >
              <div className="mb-5 inline-flex size-11 items-center justify-center rounded-xl bg-accent text-accent-foreground transition-colors group-hover:bg-brand group-hover:text-white">
                <f.icon className="size-5" />
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {f.title}
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StepUploadArt() {
  return (
    <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
      <defs>
        <linearGradient id="stepBrand1" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path
        d="M22 24 Q19 24 18.5 27 Q15 27 15 30.5 Q15 34 18.5 34 H38 Q42 34 42 30 Q42 26 38 26 Q37.5 22.5 34 22.5 Q32 19.5 28 20.5 Q24 20 22 24 Z"
        fill="url(#stepBrand1)"
        fillOpacity="0.14"
        stroke="url(#stepBrand1)"
        strokeWidth="1.5"
      />
      <path
        d="M28.5 32 V24 M28.5 24 L25 27.5 M28.5 24 L32 27.5"
        stroke="url(#stepBrand1)"
        strokeWidth="2.4"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      <path d="M10 50 L14 42 H38 L46 48 H52 V53 H10 Z" fill="#cbd5e1" />
      <circle cx="20" cy="53" r="3.2" fill="#1f2937" />
      <circle cx="44" cy="53" r="3.2" fill="#1f2937" />
    </svg>
  );
}

function StepMagicArt() {
  return (
    <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
      <defs>
        <linearGradient id="stepBrand2" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <path d="M12 40 L16 32 H40 L48 38 H54 V43 H12 Z" fill="#cbd5e1" />
      <circle cx="22" cy="43" r="3.2" fill="#1f2937" />
      <circle cx="46" cy="43" r="3.2" fill="#1f2937" />
      <path
        d="M14 10 L16 15 L21 17 L16 19 L14 24 L12 19 L7 17 L12 15 Z"
        fill="url(#stepBrand2)"
      />
      <path
        d="M52 14 L53.5 17.5 L57 19 L53.5 20.5 L52 24 L50.5 20.5 L47 19 L50.5 17.5 Z"
        fill="url(#stepBrand2)"
        fillOpacity="0.75"
      />
      <path
        d="M54 50 L55 52.5 L57.5 53.5 L55 54.5 L54 57 L53 54.5 L50.5 53.5 L53 52.5 Z"
        fill="url(#stepBrand2)"
        fillOpacity="0.55"
      />
      <path
        d="M9 52 L10 54 L12 54.8 L10 55.6 L9 57.6 L8 55.6 L6 54.8 L8 54 Z"
        fill="url(#stepBrand2)"
        fillOpacity="0.45"
      />
    </svg>
  );
}

function StepDownloadArt() {
  return (
    <svg viewBox="0 0 64 64" className="size-16" aria-hidden>
      <defs>
        <linearGradient id="stepBrand3" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#2563eb" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
      <rect
        x="9"
        y="9"
        width="46"
        height="32"
        rx="5"
        fill="url(#stepBrand3)"
        fillOpacity="0.1"
        stroke="url(#stepBrand3)"
        strokeWidth="1.8"
      />
      <path d="M17 32 L21 25 H37 L43 30 H47 V35 H17 Z" fill="#cbd5e1" />
      <circle cx="24" cy="35" r="2.4" fill="#1f2937" />
      <circle cx="42" cy="35" r="2.4" fill="#1f2937" />
      <path
        d="M32 46 V58 M32 58 L26.5 52.5 M32 58 L37.5 52.5"
        stroke="url(#stepBrand3)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}

const STEPS = [
  {
    Art: StepUploadArt,
    title: "Tölts fel egy fotót",
    body: "Drag & drop, vagy tallózás. JPG, PNG, WebP, 12 MB-ig.",
  },
  {
    Art: StepMagicArt,
    title: "AI cseréli a hátteret",
    body: "2-5 másodperc alatt elkészül — kivágás + showroom háttér rárakása.",
  },
  {
    Art: StepDownloadArt,
    title: "Töltsd le, használd",
    body: "JPG-ben letölthető, hirdetésre, OLX-re, használtautóra azonnal kész.",
  },
];

function HowItWorks() {
  return (
    <section id="hogyan" className="border-t border-border/60 bg-white">
      <div className="mx-auto max-w-6xl px-6 py-20 md:py-28">
        <div className="mb-14 text-center">
          <p className="mb-3 text-sm font-medium uppercase tracking-wider text-brand">
            Hogyan működik
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-foreground md:text-4xl">
            Három lépés. Nulla bonyolítás.
          </h2>
        </div>

        <div className="relative grid gap-6 md:grid-cols-3">
          {/* Connector line */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-[16%] top-[2.75rem] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block"
          />
          {STEPS.map((s, i) => (
            <div key={s.title} className="relative flex flex-col items-center text-center">
              <div className="relative mb-5">
                <div className="flex size-22 items-center justify-center rounded-3xl border border-border/70 bg-white shadow-soft">
                  <s.Art />
                </div>
                <span className="absolute -right-2 -top-2 flex size-7 items-center justify-center rounded-full bg-brand text-xs font-semibold text-white shadow-soft">
                  {i + 1}
                </span>
              </div>
              <h3 className="mb-2 text-lg font-semibold tracking-tight text-foreground">
                {s.title}
              </h3>
              <p className="max-w-xs text-sm leading-relaxed text-muted-foreground">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section id="arak" className="border-t border-border/60 bg-secondary/40">
      <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
        <div className="relative overflow-hidden rounded-3xl bg-brand p-10 text-center shadow-soft-lg md:p-16">
          {/* Decorative blobs */}
          <div
            aria-hidden
            className="pointer-events-none absolute -right-20 -top-20 size-72 rounded-full bg-white/15 blur-3xl"
          />
          <div
            aria-hidden
            className="pointer-events-none absolute -bottom-24 -left-24 size-80 rounded-full bg-white/10 blur-3xl"
          />
          <div className="relative">
            <h2 className="text-3xl font-semibold tracking-tight text-white md:text-5xl">
              Készen állsz, hogy szebbek legyenek a hirdetéseid?
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-base text-white/85 md:text-lg">
              Ingyenes 3 kép havonta. Próbáld ki most, regisztrálj 30 másodperc alatt.
            </p>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/sign-up"
                className="inline-flex h-12 min-w-[200px] items-center justify-center gap-2 rounded-full bg-white px-6 text-base font-medium text-foreground shadow-soft transition-all hover:bg-white/95 hover:shadow-soft-lg"
              >
                Kezdj el ingyen
                <ArrowRight className="size-4" />
              </Link>
              <Link
                href="/sign-in"
                className="inline-flex h-12 min-w-[200px] items-center justify-center rounded-full border border-white/30 px-6 text-base font-medium text-white transition-colors hover:bg-white/10"
              >
                Bejelentkezés
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-10 text-sm text-muted-foreground md:flex-row">
        <div className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand">
            <Car className="size-3.5 text-white" />
          </span>
          <span className="font-medium text-foreground">Autókép</span>
          <span>© {new Date().getFullYear()}</span>
        </div>
        <div className="flex items-center gap-6">
          <a href="mailto:hello@autokep.com" className="transition-colors hover:text-foreground">
            hello@autokep.com
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            Adatvédelem
          </a>
          <a href="#" className="transition-colors hover:text-foreground">
            ÁSZF
          </a>
        </div>
      </div>
    </footer>
  );
}
