"use server";

import { redirect } from "next/navigation";
import { stripe, TOPUP_PACKS } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/server/users";

function appUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL;
  if (!url) throw new Error("Hiányzik a NEXT_PUBLIC_APP_URL env változó.");
  return url;
}

async function ensureStripeCustomer(userId: string, email: string, clerkId: string, existingCustomerId: string | null): Promise<string> {
  if (existingCustomerId) return existingCustomerId;

  const customer = await stripe.customers.create({
    email,
    metadata: { userId, clerkId },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { stripeCustomerId: customer.id },
  });
  return customer.id;
}

export async function createSubscriptionCheckout() {
  const user = await getOrCreateUser();
  const customerId = await ensureStripeCustomer(
    user.id,
    user.email,
    user.clerkId,
    user.stripeCustomerId,
  );

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: process.env.STRIPE_PRICE_SUBSCRIPTION!, quantity: 1 }],
    success_url: `${appUrl()}/dashboard/billing?success=subscription`,
    cancel_url: `${appUrl()}/pricing?canceled=1`,
    locale: "hu",
    allow_promotion_codes: true,
    subscription_data: {
      metadata: { userId: user.id },
    },
  });

  if (!session.url) throw new Error("Stripe nem adott vissza checkout URL-t.");
  redirect(session.url);
}

export async function createTopupCheckout(priceId: string) {
  if (!TOPUP_PACKS[priceId]) throw new Error("Ismeretlen csomag.");
  const user = await getOrCreateUser();
  const customerId = await ensureStripeCustomer(
    user.id,
    user.email,
    user.clerkId,
    user.stripeCustomerId,
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${appUrl()}/dashboard/billing?success=topup`,
    cancel_url: `${appUrl()}/dashboard/topup?canceled=1`,
    locale: "hu",
    metadata: { userId: user.id, type: "topup", priceId },
    payment_intent_data: {
      metadata: { userId: user.id, type: "topup", priceId },
    },
  });

  if (!session.url) throw new Error("Stripe nem adott vissza checkout URL-t.");
  redirect(session.url);
}

export async function openCustomerPortal() {
  const user = await getOrCreateUser();
  if (!user.stripeCustomerId) {
    throw new Error("Még nincs Stripe ügyfél — fizess elő először.");
  }

  const portal = await stripe.billingPortal.sessions.create({
    customer: user.stripeCustomerId,
    return_url: `${appUrl()}/dashboard/billing`,
  });

  redirect(portal.url);
}
