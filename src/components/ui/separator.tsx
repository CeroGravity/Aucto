import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

type SeparatorProps = Omit<ComponentProps<"div">, "ref"> & {
  orientation?: "horizontal" | "vertical";
  decorative?: boolean;
};

// Token-styled rule, server-safe. Decorative by default (role="none"); when a
// meaningful divider is needed, renders a native <hr> so separator semantics
// come from the element itself.
export function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: SeparatorProps) {
  const sizing = cn(
    "shrink-0 bg-border",
    orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
    className,
  );

  if (decorative) {
    return <div data-slot="separator" role="none" className={sizing} {...props} />;
  }

  return (
    <hr
      data-slot="separator"
      aria-orientation={orientation}
      className={cn("border-0", sizing)}
      {...props}
    />
  );
}
