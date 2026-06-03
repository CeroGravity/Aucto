import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/ui/container";
import { Separator } from "@/components/ui/separator";
import { env } from "@/lib/env";
import { footerColumns } from "@/lib/nav";

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-border bg-background">
      <Container className="py-12 md:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
          <div className="col-span-2 flex flex-col gap-4 md:col-span-1">
            <Logo />
            <p className="max-w-xs text-muted-foreground text-sm">Move with Power.</p>
          </div>

          {footerColumns.map((column) => (
            <nav key={column.title} aria-label={column.title} className="flex flex-col gap-3">
              <h2 className="font-semibold text-sm">{column.title}</h2>
              <ul className="flex flex-col gap-2">
                {column.links.map((link) => (
                  <li key={`${column.title}-${link.label}`}>
                    <Link
                      href={link.href}
                      className="rounded-sm text-muted-foreground text-sm transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <Separator className="my-8" />

        <p className="max-w-2xl text-muted-foreground text-sm leading-relaxed">
          <strong className="font-display font-bold text-primary">Aucto</strong>{" "}
          <span className="font-mono">/ˈɔːk.toʊ/</span> (AWK-toh) · <em>n.</em> Growth; advancement;
          the act of creating and elevating. — <em>from the Latin root</em>{" "}
          <span className="font-mono">auct-</span>, <em>"to increase," "to grow."</em>
        </p>

        <Separator className="my-8" />

        <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
          <p className="text-muted-foreground text-sm">
            © {new Date().getFullYear()} Aucto. All rights reserved.
          </p>
          {env.NEXT_PUBLIC_FACEBOOK_URL ? (
            <a
              href={env.NEXT_PUBLIC_FACEBOOK_URL}
              target="_blank"
              rel="noreferrer"
              className="rounded-sm text-primary text-sm underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Message us on Facebook
            </a>
          ) : null}
        </div>
      </Container>
    </footer>
  );
}
