import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Locally stored platform marks are immutable and safe to cache hard.
        // Cache-Control for authenticated pages is set in proxy.ts, which
        // takes precedence over config headers for page responses.
        source: "/assets/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
