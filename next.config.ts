import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Next app root (directory containing this file). Never use process.cwd() — it breaks resolution when dev runs from the repo root. */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  // Next.js 16 requires turbopack.root and outputFileTracingRoot to be the same absolute path.
  turbopack: { root: appRoot },
  outputFileTracingRoot: appRoot,
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  webpack: (config) => {
    config.resolve ??= {};
    config.resolve.alias = {
      ...config.resolve.alias,
      "lucide-react": path.join(appRoot, "node_modules", "lucide-react"),
    };
    return config;
  },
};

export default nextConfig;
