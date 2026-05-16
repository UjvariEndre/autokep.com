import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function Home() {
  const { userId } = await auth();
  if (userId) redirect("/dashboard");

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-6 py-32 text-center">
      <div className="flex max-w-2xl flex-col items-center gap-6">
        <h1 className="text-5xl font-bold tracking-tight text-zinc-900">
          Cseréld le az autód hátterét másodpercek alatt
        </h1>
        <p className="max-w-xl text-lg text-zinc-600">
          Töltsd fel a fotót, AI levágja a hátteret, mi rárakjuk a stúdió
          hátterünket. Kereskedőknek, magánszemélyeknek.
        </p>
        <div className="mt-4 flex items-center gap-3">
          <Link href="/sign-up" className={cn(buttonVariants({ size: "lg" }))}>
            Próbáld ki ingyen
          </Link>
          <Link
            href="/sign-in"
            className={cn(buttonVariants({ variant: "outline", size: "lg" }))}
          >
            Bejelentkezés
          </Link>
        </div>
        <p className="text-sm text-zinc-500">
          Ingyenes 3 kép havonta, bankkártya nem szükséges.
        </p>
      </div>
    </main>
  );
}
