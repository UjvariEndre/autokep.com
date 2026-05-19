import { DashboardShell } from "@/components/dashboard-shell";
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
    >
      {children}
    </DashboardShell>
  );
}
