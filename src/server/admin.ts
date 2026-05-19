import "server-only";
import { getOrCreateUser } from "@/server/users";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return adminEmails().includes(email.toLowerCase());
}

export class ForbiddenError extends Error {
  constructor() {
    super("Nincs jogosultságod ehhez az oldalhoz.");
    this.name = "ForbiddenError";
  }
}

export async function requireAdmin() {
  const user = await getOrCreateUser();
  if (!isAdminEmail(user.email)) {
    throw new ForbiddenError();
  }
  return user;
}
