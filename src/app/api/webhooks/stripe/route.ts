import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { stripe, TOPUP_PACKS, SUBSCRIPTION_CREDITS_PER_MONTH } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// In Stripe API 2025-03-31.basil+ (we're on 2026-04-22.dahlia), current_period_end
// moved from Subscription to SubscriptionItem. Read it from the first item.
function periodEndFrom(sub: Stripe.Subscription): Date | null {
  const ts = sub.items?.data?.[0]?.current_period_end;
  return typeof ts === "number" ? new Date(ts * 1000) : null;
}

// In the same API change, Invoice.subscription was replaced by Invoice.parent.subscription_details.
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const parent = invoice.parent;
  if (!parent || parent.type !== "subscription_details") return null;
  const sub = parent.subscription_details?.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new NextResponse("Missing signature", { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!,
    );
  } catch (err) {
    console.error("Stripe signature failed:", err);
    return new NextResponse("Invalid signature", { status: 400 });
  }

  const existing = await prisma.webhookEvent.findUnique({ where: { id: event.id } });
  if (existing) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    await handleEvent(event);
    await prisma.webhookEvent.create({ data: { id: event.id, type: event.type } });
  } catch (err) {
    console.error(`Webhook ${event.type} (${event.id}) failed:`, err);
    return new NextResponse("Handler error", { status: 500 });
  }

  return NextResponse.json({ received: true });
}

async function handleEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
      await onCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
      break;

    case "invoice.payment_succeeded":
      await onInvoicePaid(event.data.object as Stripe.Invoice);
      break;

    case "customer.subscription.updated":
    case "customer.subscription.deleted":
      await onSubscriptionChanged(event.data.object as Stripe.Subscription);
      break;

    case "invoice.payment_failed":
      await onInvoiceFailed(event.data.object as Stripe.Invoice);
      break;

    default:
      // Ignore other events
      break;
  }
}

async function onCheckoutCompleted(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.userId;
  if (!userId) return;

  if (session.mode === "subscription" && session.subscription) {
    const subId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
    const sub = await stripe.subscriptions.retrieve(subId);
    await prisma.user.update({
      where: { id: userId },
      data: {
        stripeSubscriptionId: subId,
        subscriptionStatus: sub.status,
        subscriptionPeriodEnd: periodEndFrom(sub),
      },
    });
    // Credits are reset by invoice.payment_succeeded — don't double-credit here.
    return;
  }

  if (session.mode === "payment" && session.metadata?.type === "topup") {
    const priceId = session.metadata.priceId;
    if (!priceId) return;
    const credits = TOPUP_PACKS[priceId];
    if (!credits) return;

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { topupCredits: { increment: credits } },
      }),
      prisma.payment.create({
        data: {
          userId,
          stripeCheckoutSessionId: session.id,
          type: "topup",
          amountHuf: Math.round((session.amount_total ?? 0) / 100),
          creditsAdded: credits,
        },
      }),
    ]);
  }
}

async function onInvoicePaid(invoice: Stripe.Invoice) {
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const userId = sub.metadata?.userId;
  if (!userId) return;

  const nextReset = periodEndFrom(sub);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionCredits: SUBSCRIPTION_CREDITS_PER_MONTH,
        creditsReset: nextReset,
        subscriptionStatus: sub.status,
        subscriptionPeriodEnd: nextReset,
        stripeSubscriptionId: subId,
      },
    }),
    prisma.payment.create({
      data: {
        userId,
        stripeInvoiceId: invoice.id,
        type: "subscription",
        amountHuf: Math.round((invoice.amount_paid ?? 0) / 100),
        creditsAdded: SUBSCRIPTION_CREDITS_PER_MONTH,
      },
    }),
  ]);
}

async function onSubscriptionChanged(sub: Stripe.Subscription) {
  const userId = sub.metadata?.userId;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionStatus: sub.status,
      subscriptionPeriodEnd: periodEndFrom(sub),
    },
  });
  // Deliberately do NOT zero subscriptionCredits — user keeps remaining
  // credits until period end (cancel-at-period-end semantics).
}

async function onInvoiceFailed(invoice: Stripe.Invoice) {
  const subId = subscriptionIdFromInvoice(invoice);
  if (!subId) return;

  const sub = await stripe.subscriptions.retrieve(subId);
  const userId = sub.metadata?.userId;
  if (!userId) return;

  await prisma.user.update({
    where: { id: userId },
    data: { subscriptionStatus: sub.status },
  });
  // TODO Session 5: send warning email.
}
