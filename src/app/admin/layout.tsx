import Link from "next/link";
import { redirect } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { isAdminEmail } from "@/server/admin";
import { getOrCreateUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateUser();
  if (!isAdminEmail(user.email)) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-white/90 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Dashboard
            </Link>
            <span className="text-border">·</span>
            <span className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground">
              <ShieldCheck className="size-4 text-brand" />
              Admin
            </span>
          </div>
          <UserButton appearance={{ elements: { avatarBox: "size-8" } }} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8 md:py-12">{children}</main>
    </div>
  );
}
