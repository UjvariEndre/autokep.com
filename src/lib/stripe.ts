import "server-only";
import Stripe from "stripe";

function requireEnv(key: string): string {
  const v = process.env[key];
  if (!v) throw new Error(`Hiányzó env változó: ${key}`);
  return v;
}

export const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"), {
  typescript: true,
});

export const SUBSCRIPTION_CREDITS_PER_MONTH = 50;

export const TOPUP_PRICE_LABELS: { priceId: string; credits: number; huf: number }[] = [
  { priceId: requireEnv("STRIPE_PRICE_TOPUP_10"), credits: 10, huf: 2500 },
  { priceId: requireEnv("STRIPE_PRICE_TOPUP_25"), credits: 25, huf: 5500 },
  { priceId: requireEnv("STRIPE_PRICE_TOPUP_60"), credits: 60, huf: 11900 },
];

export const TOPUP_PACKS: Record<string, number> = Object.fromEntries(
  TOPUP_PRICE_LABELS.map(({ priceId, credits }) => [priceId, credits]),
);
