import Image from "next/image";

import { cn } from "@/lib/utils";

type LogoProps = {
  className?: string;
};

// Brand logo: two pre-placed SVGs swapped by theme via Tailwind dark variants.
// No currentColor, no inline paths, no client component. Explicit width/height
// reserve space (no CLS); the SVG is served as-is (unoptimized).
export function Logo({ className }: LogoProps) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      <Image
        src="/aucto-logo.svg"
        alt="AUCTO"
        width={52}
        height={32}
        priority
        unoptimized
        className="h-8 w-auto dark:hidden"
      />
      <Image
        src="/aucto-logo-white.svg"
        alt="AUCTO"
        width={52}
        height={32}
        priority
        unoptimized
        className="hidden h-8 w-auto dark:block"
      />
    </span>
  );
}
