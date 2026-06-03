import type { ReactNode } from "react";

import { Container } from "@/components/ui/container";
import { requireAdminPage } from "@/lib/auth/admin";

// Server-side gate for the whole /admin group: logged out → /login,
// non-admin → notFound (no PII, no UI flash). Re-checked in every action.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  await requireAdminPage();
  return (
    <Container className="py-10">
      <p className="font-medium text-muted-foreground text-xs uppercase tracking-widest">
        Aucto admin
      </p>
      {children}
    </Container>
  );
}
