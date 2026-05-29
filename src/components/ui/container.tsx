import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

// Centered max-width wrapper with mobile-first horizontal padding.
// Single source of page gutters so every route lines up.
export function Container({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-12", className)} {...props} />
  );
}
