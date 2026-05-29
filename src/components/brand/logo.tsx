import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

// Placeholder brand mark. Swap the inner glyph/wordmark for the real asset
// later — keep this component as the single import site so the swap is trivial.
export function Logo({ className }: LogoProps) {
  return (
    <span
      className={cn(
        "inline-flex select-none items-center gap-2 font-display text-xl font-bold tracking-tight",
        className,
      )}
    >
      <span
        aria-hidden
        className="inline-flex size-6 items-center justify-center rounded-sm bg-accent text-accent-foreground text-sm"
      >
        A
      </span>
      <span>AUCTO</span>
    </span>
  );
}
