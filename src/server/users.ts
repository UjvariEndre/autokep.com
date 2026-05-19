import "server-only";
import { auth, currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import type { UserModel } from "@/generated/prisma/models";

export class UnauthenticatedError extends Error {
  constructor() {
    super("Nincs bejelentkezve.");
    this.name = "UnauthenticatedError";
  }
}

export async function getOrCreateUser(): Promise<UserModel> {
  const { userId } = await auth();
  if (!userId) throw new UnauthenticatedError();

  const existing = await prisma.user.findUnique({ where: { clerkId: userId } });
  if (existing) return existing;

  const clerkUser = await currentUser();
  if (!clerkUser) throw new UnauthenticatedError();

  const primaryId = clerkUser.primaryEmailAddressId;
  const primary =
    clerkUser.emailAddresses.find((e) => e.id === primaryId) ??
    clerkUser.emailAddresses[0];
  const email = primary?.emailAddress;
  if (!email) {
    throw new Error("A Clerk user-nek nincs email címe.");
  }

  // Trial credits (subscriptionCredits = 3 default) don't reset — creditsReset
  // is set later by the subscription invoice webhook to current_period_end.
  return prisma.user.create({
    data: {
      clerkId: userId,
      email,
    },
  });
}
