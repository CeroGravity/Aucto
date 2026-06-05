import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    // Product images are served same-origin from /api/images/<key> (which
    // next/image optimizes via the built-in loader); with STORAGE_PROVIDER=blob
    // a public blob URL may also be referenced, so allow the Vercel Blob host.
    remotePatterns: [{ protocol: "https", hostname: "*.public.blob.vercel-storage.com" }],
  },
};

export default nextConfig;
