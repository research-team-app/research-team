import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

const isDev = process.env.NODE_ENV === "development";
const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  output: "export",
  trailingSlash: true,
  turbopack: {
    root: projectRoot,
  },
  ...(isDev && {
    async rewrites() {
      const backend = process.env.API_BACKEND_URL || "http://127.0.0.1:8080";
      return [
        {
          source: "/api-proxy/:path*",
          destination: `${backend}/:path*`,
        },
      ];
    },
  }),
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
