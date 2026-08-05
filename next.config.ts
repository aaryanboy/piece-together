import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // Exclude server-only packages from the client bundle
  serverExternalPackages: ["better-sqlite3"],
};

export default nextConfig;
