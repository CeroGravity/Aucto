import type { MetadataRoute } from "next";

// Web app manifest (served at /manifest.webmanifest). Icons reference the brand
// set that Next serves from app/: icon.png (any/maskable) and apple-icon.png.
// Navy theme-color matches the brand chrome.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Aucto — Move with Power",
    short_name: "Aucto",
    description: "Performance training gear and fightwear for Bangladesh.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1B2A4D",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
