"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserButton } from "@clerk/nextjs";
import { Car, Coins, Home, Images, Menu, Plus, ShieldCheck, X } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Props = {
  subscriptionCredits: number;
  topupCredits: number;
  email: string;
  isAdmin: boolean;
  children: React.ReactNode;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Kezdőlap", icon: Home, match: "exact" as const },
  { href: "/dashboard/galeria", label: "Galéria", icon: Images, match: "prefix" as const },
  { href: "/dashboard/billing", label: "Számlázás", icon: Coins, match: "prefix" as const },
];

const ADMIN_NAV_ITEM = {
  href: "/admin/support",
  label: "Support inbox",
  icon: ShieldCheck,
  match: "prefix" as const,
};

export function DashboardShell({ subscriptionCredits, topupCredits, email, isAdmin, children }: Props) {
  const totalCredits = subscriptionCredits + topupCredits;
  const navItems = isAdmin ? [...NAV_ITEMS, ADMIN_NAV_ITEM] : NAV_ITEMS;
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  function isActive(href: string, match: "exact" | "prefix") {
    if (match === "exact") return pathname === href;
    return pathname.startsWith(href);
  }

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-border/60 px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex size-8 items-center justify-center rounded-xl bg-brand shadow-soft">
            <Car className="size-4 text-white" />
          </span>
          <span className="text-base font-semibold tracking-tight">
            Autókép<span className="text-brand">.</span>
          </span>
        </Link>
      </div>

      {/* Primary CTA */}
      <div className="px-4 pt-5 pb-3">
        <Link
          href="/dashboard/new"
          onClick={() => setMobileOpen(false)}
          className={cn(buttonVariants({ size: "default" }), "w-full")}
        >
          <Plus className="size-4" />
          Új kép
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 space-y-1 px-3 pt-2">
        {navItems.map((item) => {
          const active = isActive(item.href, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Credits + user */}
      <div className="border-t border-border/60 p-4">
        <div className="mb-3 flex items-center justify-between rounded-xl bg-accent/60 px-3.5 py-2.5">
          <div className="flex items-center gap-2 text-sm">
            <Coins className="size-4 text-brand" />
            <span className="font-medium text-foreground">{totalCredits}</span>
            <span className="text-muted-foreground">
              kredit
              {topupCredits > 0 && (
                <span className="ml-1 text-[11px]">
                  ({subscriptionCredits}+{topupCredits})
                </span>
              )}
            </span>
          </div>
          {totalCredits === 0 && (
            <Link
              href="/pricing"
              onClick={() => setMobileOpen(false)}
              className="rounded-md bg-brand px-2 py-0.5 text-[11px] font-medium text-white hover:bg-brand/90"
            >
              Tölts fel
            </Link>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-xl px-1 py-1">
          <UserButton
            appearance={{
              elements: { avatarBox: "size-8" },
            }}
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium text-foreground">{email}</p>
            <p className="text-[11px] text-muted-foreground">Bejelentkezve</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-secondary/40">
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border/60 bg-white/90 px-4 backdrop-blur md:hidden">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-lg bg-brand">
            <Car className="size-3.5 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Autókép</span>
        </Link>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-accent-foreground">
            <Coins className="size-3" />
            {totalCredits} kredit
          </span>
          <button
            type="button"
            aria-label="Menü megnyitása"
            onClick={() => setMobileOpen(true)}
            className="inline-flex size-9 items-center justify-center rounded-lg text-foreground hover:bg-secondary"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </header>

      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-64 border-r border-border/60 bg-sidebar md:block">
        {sidebarContent}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-foreground/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 w-72 border-r border-border bg-sidebar shadow-soft-lg">
            <button
              type="button"
              aria-label="Menü bezárása"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-3 inline-flex size-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-secondary"
            >
              <X className="size-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-8 md:px-10 md:py-12">{children}</div>
      </main>
    </div>
  );
}
