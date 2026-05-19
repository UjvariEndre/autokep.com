"use server";

import { revalidatePath } from "next/cache";
import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import { getOrCreateUser } from "@/server/users";
import { requireAdmin } from "@/server/admin";

const MAX_MESSAGE = 2000;
const MIN_MESSAGE = 2;

type Result = { ok: true } | { ok: false; error: string };

function validateBody(raw: string): string | { error: string } {
  const body = raw.trim();
  if (body.length < MIN_MESSAGE) return { error: "Az üzenet túl rövid." };
  if (body.length > MAX_MESSAGE) {
    return { error: `Maximum ${MAX_MESSAGE} karakter írható.` };
  }
  return body;
}

// ---------- User-side actions ----------

export async function submitSupportMessage(input: { body: string }): Promise<Result> {
  const user = await getOrCreateUser();
  const validated = validateBody(input.body);
  if (typeof validated !== "string") return { ok: false, error: validated.error };

  const now = new Date();

  // Find or create the user's single thread; reopen if it was closed.
  const thread = await prisma.supportThread.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      status: "open",
      lastMessageAt: now,
      unreadByAdmin: 1,
      messages: { create: { author: "USER", body: validated } },
    },
    update: {
      status: "open",
      lastMessageAt: now,
      unreadByAdmin: { increment: 1 },
      messages: { create: { author: "USER", body: validated } },
    },
  });

  await sendAdminNotification({
    userEmail: user.email,
    body: validated,
    threadId: thread.id,
  }).catch((err) => console.error("Admin notification failed:", err));

  revalidatePath("/admin/support");
  return { ok: true };
}

export async function getMyThread(): Promise<{
  thread: { id: string; status: string; messages: Array<{ id: string; author: "USER" | "ADMIN"; body: string; createdAt: string }> } | null;
}> {
  const user = await getOrCreateUser();
  const thread = await prisma.supportThread.findUnique({
    where: { userId: user.id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!thread) return { thread: null };

  return {
    thread: {
      id: thread.id,
      status: thread.status,
      messages: thread.messages.map((m) => ({
        id: m.id,
        author: m.author,
        body: m.body,
        createdAt: m.createdAt.toISOString(),
      })),
    },
  };
}

export async function markMyThreadRead(): Promise<void> {
  const user = await getOrCreateUser();
  await prisma.supportThread.updateMany({
    where: { userId: user.id, unreadByUser: { gt: 0 } },
    data: { unreadByUser: 0 },
  });
}

// ---------- Admin actions ----------

export async function adminReply(input: {
  threadId: string;
  body: string;
}): Promise<Result> {
  await requireAdmin();
  const validated = validateBody(input.body);
  if (typeof validated !== "string") return { ok: false, error: validated.error };

  const thread = await prisma.supportThread.update({
    where: { id: input.threadId },
    data: {
      lastMessageAt: new Date(),
      unreadByUser: { increment: 1 },
      messages: { create: { author: "ADMIN", body: validated } },
    },
    include: { user: true },
  });

  await sendUserNotification({
    userEmail: thread.user.email,
    body: validated,
  }).catch((err) => console.error("User notification failed:", err));

  revalidatePath(`/admin/support/${input.threadId}`);
  revalidatePath("/admin/support");
  return { ok: true };
}

export async function adminCloseThread(threadId: string): Promise<void> {
  await requireAdmin();
  await prisma.supportThread.update({
    where: { id: threadId },
    data: { status: "closed" },
  });
  revalidatePath(`/admin/support/${threadId}`);
  revalidatePath("/admin/support");
}

export async function adminReopenThread(threadId: string): Promise<void> {
  await requireAdmin();
  await prisma.supportThread.update({
    where: { id: threadId },
    data: { status: "open" },
  });
  revalidatePath(`/admin/support/${threadId}`);
  revalidatePath("/admin/support");
}

export async function adminMarkThreadRead(threadId: string): Promise<void> {
  await requireAdmin();
  await prisma.supportThread.updateMany({
    where: { id: threadId, unreadByAdmin: { gt: 0 } },
    data: { unreadByAdmin: 0 },
  });
  revalidatePath("/admin/support");
}

// ---------- Email helpers ----------

async function sendAdminNotification(args: {
  userEmail: string;
  body: string;
  threadId: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.SUPPORT_EMAIL;
  const from = process.env.SUPPORT_EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!apiKey || !to || !from) {
    console.log(`[support] new user msg from ${args.userEmail} stored (Resend not configured)`);
    return;
  }

  const resend = new Resend(apiKey);
  const link = `${appUrl}/admin/support/${args.threadId}`;
  await resend.emails.send({
    from,
    to,
    replyTo: args.userEmail,
    subject: `[Autokep] Új support üzenet — ${args.userEmail}`,
    text: [
      `Új üzenet érkezett a chatben.`,
      ``,
      `Ügyfél: ${args.userEmail}`,
      `Válasz: ${link}`,
      ``,
      `--- Üzenet ---`,
      args.body,
    ].join("\n"),
  });
}

async function sendUserNotification(args: {
  userEmail: string;
  body: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.SUPPORT_EMAIL_FROM;
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  if (!apiKey || !from) return;

  const resend = new Resend(apiKey);
  const link = `${appUrl}/dashboard`;
  await resend.emails.send({
    from,
    to: args.userEmail,
    subject: `[Autokep] Válasz az ügyfélszolgálattól`,
    text: [
      `Új válasz érkezett a chatben:`,
      ``,
      args.body,
      ``,
      `Nyisd meg a chatet: ${link}`,
    ].join("\n"),
  });
}
