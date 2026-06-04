import type { Metadata, Viewport } from "next";
import { Archivo, Inter } from "next/font/google";
import type { ReactNode } from "react";

import { CartProvider } from "@/components/features/cart-drawer";
import { SiteFooter } from "@/components/layout/site-footer";
import { SiteHeader } from "@/components/layout/site-header";
import { ThemeProvider } from "@/components/theme-provider";
import { env } from "@/lib/env";
import { cn } from "@/lib/utils";
import { getCart } from "@/server/queries/cart";
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

const SITE_NAME = "Aucto";
const SITE_DESCRIPTION = "Aucto — Move with Power. Performance training gear and fightwear.";

export const metadata: Metadata = {
  metadataBase: new URL(env.APP_URL),
  title: {
    default: "Aucto — Move with Power",
    template: "%s · Aucto",
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  // Indexable by default; private routes opt out with their own `robots`.
  robots: { index: true, follow: true },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_US",
    title: "Aucto — Move with Power",
    description: SITE_DESCRIPTION,
    // Falls back to the brand opengraph-image.png (app/opengraph-image.png),
    // which Next includes automatically as the default OG image.
  },
  twitter: {
    card: "summary_large_image",
    title: "Aucto — Move with Power",
    description: SITE_DESCRIPTION,
  },
};

// Brand navy theme-color (light + dark both use the navy chrome accent).
export const viewport: Viewport = {
  themeColor: "#1B2A4D",
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const cart = await getCart();
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(inter.variable, display.variable, "min-h-dvh antialiased")}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <a
            href="#main-content"
            className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-50 focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-medium focus:text-primary-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            Skip to content
          </a>
          <CartProvider cart={cart}>
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
