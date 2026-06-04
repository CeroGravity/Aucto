import type { MetadataRoute } from "next";

import { env } from "@/lib/env";

// robots.txt — allow public storefront, block private/transactional areas.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/account", "/checkout", "/api"],
    },
    sitemap: new URL("/sitemap.xml", env.APP_URL).toString(),
  };
}
