import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Server Actions receive the listing photos via FormData.
    // Default body limits can be too small for a couple of camera images.
    serverActions: {
      bodySizeLimit: "20mb",
    },
  },
};

export default nextConfig;
