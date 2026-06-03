"use client";

import { LayoutDashboard, Package, ShoppingBag } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  href: string;
  icon: typeof LayoutDashboard;
  comingSoon?: boolean;
};

const items: NavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Orders", href: "/admin/orders", icon: ShoppingBag },
  { label: "Products", href: "/admin/products", icon: Package },
];

export function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav aria-label="Admin" className="flex flex-col gap-1">
      {items.map((item) => {
        const active =
          item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
        const Icon = item.icon;
        const className = cn(
          "flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          active
            ? "bg-primary text-primary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        );
        return item.comingSoon ? (
          <span
            key={item.label}
            aria-disabled="true"
            className={cn(className, "cursor-not-allowed opacity-60")}
            title="Coming soon"
          >
            <Icon className="size-4" />
            {item.label}
            <span className="ml-auto text-[10px] uppercase">soon</span>
          </span>
        ) : (
          <Link
            key={item.label}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={className}
            onClick={onNavigate}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
