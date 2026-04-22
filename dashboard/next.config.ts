import type { NextConfig } from "next";

const API_URL = process.env.API_URL || "http://localhost:8000";

const nextConfig: NextConfig = {
  env: {
    // Expose the backend URL to the browser for direct file upload calls (multipart bypass)
    NEXT_PUBLIC_API_URL: process.env.API_URL || "http://localhost:8000",
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${API_URL}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
