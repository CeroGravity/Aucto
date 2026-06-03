import Link from "next/link";

import { cn } from "@/lib/utils";

// Dashboard overview card. When `href` is set the whole card is a link to the
// matching filtered order list.
export function StatCard({
  label,
  value,
  href,
  highlight,
}: {
  label: string;
  value: number;
  href?: string;
  highlight?: boolean;
}) {
  const inner = (
    <>
      <span className="text-muted-foreground text-sm">{label}</span>
      <span
        className={cn(
          "mt-2 font-display font-bold text-3xl tracking-tight",
          highlight && value > 0 ? "text-accent" : "text-primary",
        )}
      >
        {value}
      </span>
    </>
  );

  const className = cn(
    "flex flex-col rounded-xl border border-border p-5 transition-colors",
    href
      ? "hover:border-foreground/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      : "",
  );

  return href ? (
    <Link href={href} className={className}>
      {inner}
    </Link>
  ) : (
    <div className={className}>{inner}</div>
  );
}
