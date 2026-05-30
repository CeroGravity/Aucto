"use client";

import { Menu } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { accountLink, cartLink, categoryNav } from "@/lib/nav";

const linkClass =
  "rounded-md px-4 py-3 text-lg font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="right">
        <SheetHeader>
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        <nav aria-label="Mobile" className="flex flex-col px-2 pb-6">
          {categoryNav.map((link) => (
            <SheetClose asChild key={link.label}>
              <Link href={link.href} className={linkClass}>
                {link.label}
              </Link>
            </SheetClose>
          ))}
          <Separator className="my-3" />
          <SheetClose asChild>
            <Link href={accountLink.href} className={linkClass}>
              {accountLink.label}
            </Link>
          </SheetClose>
          <SheetClose asChild>
            <Link href={cartLink.href} className={linkClass}>
              {cartLink.label}
            </Link>
          </SheetClose>
        </nav>
        <Separator className="mx-2 w-auto" />
        <div className="flex items-center justify-between px-6 py-4">
          <span className="font-medium text-muted-foreground text-sm">Theme</span>
          <ThemeToggle />
        </div>
      </SheetContent>
    </Sheet>
  );
}
