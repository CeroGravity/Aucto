import type { Metadata } from "next";
import { Archivo, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { CartContents } from "@/components/features/cart-contents";
import { CartProvider } from "@/components/features/cart-drawer";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@/lib/utils";
import { getCartCount } from "@/server/queries/cart";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

const display = Archivo({
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://aucto.example"),
  title: {
    default: "Aucto — Move with Power",
    template: "%s — Aucto",
  },
  description: "Aucto — Move with Power. Performance training gear and fightwear.",
  openGraph: {
    title: "Aucto — Move with Power",
    description: "Aucto — Move with Power. Performance training gear and fightwear.",
  },
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cartCount = await getCartCount();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, display.variable, "min-h-dvh antialiased")}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          <CartProvider count={cartCount} contents={<CartContents />}>
            <div className="flex min-h-dvh flex-col">
              <SiteHeader />
              <main id="main-content" className="flex-1">
                {children}
              </main>
              <SiteFooter />
            </div>
          </CartProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
