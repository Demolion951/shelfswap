import type { MetadataRoute } from "next";

/**
 * Web app manifest for Add to Home Screen (Android / desktop PWA) and install prompts.
 * Icons live in public/brand/ — regenerate via npm run brand:app-icons.
 * Location: app/manifest.ts
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ShelfSwap",
    short_name: "ShelfSwap",
    description: "Local book marketplace — list, discover, and swap near you.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f9ecdc",
    theme_color: "#f9ecdc",
    icons: [
      {
        src: "/brand/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
