import { User } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { CartButton } from "@/components/features/cart-drawer";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { accountLink, categoryNav } from "@/lib/nav";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-border border-b bg-background">
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-8">
          <Link
            href="/"
            aria-label="Aucto home"
            className="rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <Logo />
          </Link>
          <nav aria-label="Primary" className="hidden md:flex md:items-center md:gap-6">
            {categoryNav.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="rounded-sm font-medium text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-1">
          <div className="mr-1 hidden md:flex md:items-center">
            <ThemeToggle />
          </div>
          <Button asChild variant="ghost" size="icon" aria-label="Account">
            <Link href={accountLink.href}>
              <User />
            </Link>
          </Button>
          <CartButton />
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
