import { DashboardShell } from "@/components/dashboard-shell";
import { isAdminEmail } from "@/server/admin";
import { getOrCreateUser } from "@/server/users";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getOrCreateUser();

  return (
    <DashboardShell
      subscriptionCredits={user.subscriptionCredits}
      topupCredits={user.topupCredits}
      email={user.email}
      isAdmin={isAdminEmail(user.email)}
    >
      {children}
    </DashboardShell>
  );
}
