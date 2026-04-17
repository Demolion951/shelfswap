import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor shell for Play Store / App Store builds (WebView → your deployed Next.js site).
 *
 * Set CAPACITOR_SERVER_URL (or NEXT_PUBLIC_SITE_URL) to your production origin, e.g.
 *   https://your-app.vercel.app
 * No trailing slash. Then: npm run cap:sync → open Android Studio / Xcode.
 *
 * appId must stay stable once published (changing it is a new listing on stores).
 * Location: capacitor.config.ts
 */
const liveUrl = (
  process.env.CAPACITOR_SERVER_URL?.trim() ||
  process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
  ""
).replace(/\/$/, "");

const config: CapacitorConfig = {
  appId: "net.shelfswap.app",
  appName: "ShelfSwap",
  webDir: "capacitor-www",
  ...(liveUrl
    ? {
        server: {
          url: liveUrl,
          androidScheme: "https",
        },
      }
    : {}),
};

export default config;
