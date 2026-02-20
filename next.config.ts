import type { NextConfig } from "next";
import path from "path";

/** Project root: config directory, or cwd when __dirname is not set (ESM). */
const projectRoot =
  typeof __dirname !== "undefined"
    ? path.resolve(__dirname)
    : path.resolve(process.cwd());

const nextConfig: NextConfig = {
  turbopack: { root: projectRoot },
  outputFileTracingRoot: projectRoot,
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
      "lucide-react": path.join(projectRoot, "node_modules", "lucide-react"),
    };
    return config;
  },
};

export default nextConfig;
