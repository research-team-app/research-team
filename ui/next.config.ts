import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  // Dev-only proxy: rewrites are ignored by `next build --export` but work in `next dev`.
  async rewrites() {
    const backend = process.env.API_BACKEND_URL || "http://127.0.0.1:8080";
    return [
      {
        source: "/api-proxy/:path*",
        destination: `${backend}/:path*`,
      },
    ];
  },
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
