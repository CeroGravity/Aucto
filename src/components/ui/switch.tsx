import * as SwitchPrimitive from "@radix-ui/react-switch";
import type { ComponentProps, ReactNode } from "react";

import { cn } from "@/lib/utils";

type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root> & {
  // Optional content rendered inside the sliding thumb (rides with it).
  thumbContent?: ReactNode;
};

function Switch({ className, thumbContent, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn(
        "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none flex size-5 items-center justify-center rounded-full bg-background text-foreground shadow-sm ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0 [&_svg]:size-3",
        )}
      >
        {thumbContent}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}

export { Switch };
