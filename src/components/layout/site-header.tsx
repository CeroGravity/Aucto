import { ShoppingBag, User } from "lucide-react";
import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { MobileNav } from "@/components/layout/mobile-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { accountLink, cartLink, categoryNav } from "@/lib/nav";

// Phase 1: cart is always empty. Real count is wired in Phase 3; the badge
// slot below stays hidden while the count is 0.
const cartCount = 0;

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
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
          <Button asChild variant="ghost" size="icon" aria-label="Account">
            <Link href={accountLink.href}>
              <User />
            </Link>
          </Button>
          <Button
            asChild
            variant="ghost"
            size="icon"
            aria-label={cartCount > 0 ? `Cart, ${cartCount} items` : "Cart, empty"}
          >
            <Link href={cartLink.href} className="relative">
              <ShoppingBag />
              {cartCount > 0 ? (
                <Badge
                  variant="accent"
                  className="-right-1 -top-1 absolute size-5 justify-center rounded-full p-0 text-[10px] leading-none"
                >
                  {cartCount}
                </Badge>
              ) : null}
            </Link>
          </Button>
          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
