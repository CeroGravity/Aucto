"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ComponentProps, useEffect } from "react";

export function ThemeProvider({ children, ...props }: ComponentProps<typeof NextThemesProvider>) {
  // Enable color transitions only after first paint, so the initial theme
  // (applied pre-paint by next-themes) doesn't animate / flash on load.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      document.documentElement.classList.add("theme-ready");
    });
    return () => cancelAnimationFrame(id);
  }, []);

  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
