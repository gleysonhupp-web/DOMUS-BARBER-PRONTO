import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable React strict mode for better performance detection
  reactStrictMode: false, // disabled to avoid double renders on mobile

  // Compress responses
  compress: true,

  // Image optimization
  images: {
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400, // cache images 24h
  },

  // Limit what packages are bundled server-side (heavy libs are client-only)
  experimental: {
    optimizePackageImports: [
      "recharts",
      "framer-motion",
      "lucide-react",
      "date-fns",
    ],
  },

  // Aggressive caching headers for static assets
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control", value: "on" },
        ],
      },
      {
        source: "/static/(.*)",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
