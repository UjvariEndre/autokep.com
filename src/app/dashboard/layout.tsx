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
    <DashboardShell creditsLeft={user.creditsLeft} email={user.email}>
      {children}
    </DashboardShell>
  );
}
