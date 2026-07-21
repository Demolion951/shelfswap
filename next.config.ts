import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions receive the listing photos via FormData.
    // Default body limits can be too small for a couple of camera images.
    serverActions: {
      bodySizeLimit: "20mb",
    },
    // Keep recently visited /app tabs in the client router cache so phone tab
    // switches feel instant (same screens; brief reuse of last RSC payload).
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
  },
};

export default nextConfig;
