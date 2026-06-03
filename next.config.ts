import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Product images are served same-origin from /api/images/<key>, which
    // next/image optimizes via the built-in loader — no remotePatterns needed
    // in dev. At deploy, add the blob host here, e.g.:
    //   remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
