import { AppShell } from "@/components/layout/app-shell";
import { getRequiredAuthContext } from "@/lib/auth/server-context";
import type { ReactNode } from "react";

export default async function ProtectedLayout({ children }: { children: ReactNode }) {
  const context = await getRequiredAuthContext();

  return (
    <AppShell
      orgId={context.org.id}
      orgName={context.org.name}
      role={context.profile.role}
      userEmail={context.email}
      branches={context.branches}
      defaultBranchId={context.settings.default_branch_id}
    >
      {children}
    </AppShell>
  );
}
