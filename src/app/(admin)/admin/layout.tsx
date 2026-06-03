import Link from "next/link";
import type { ReactNode } from "react";

import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { requireAdminPage } from "@/lib/auth/admin";
import { logoutUser } from "@/server/actions/auth";

// Server-side gate for the whole /admin group (unchanged from 5d): logged out →
// /login, non-admin → notFound. Wraps the panel shell (sidebar + topbar).
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await requireAdminPage();

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-border border-b bg-background px-4">
        <AdminMobileNav />
        <Link href="/admin" className="flex items-center gap-2">
          <Logo />
          <span className="hidden font-medium text-muted-foreground text-xs uppercase tracking-widest sm:inline">
            Admin
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-muted-foreground text-sm sm:inline">
            {user.name ?? user.email}
          </span>
          <form action={logoutUser}>
            <Button type="submit" variant="outline" size="sm">
              Log out
            </Button>
          </form>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-60 shrink-0 border-border border-r p-4 md:block">
          <AdminSidebar />
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
