import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";
import { contentSecurityPolicy } from "./lib/content-security-policy";

/** Next app root (directory containing this file). Never use process.cwd() — it breaks resolution when dev runs from the repo root. */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy({
      apiUrl: process.env.NEXT_PUBLIC_API_URL,
      clerkPublishableKey: process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY,
    }),
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  // Next.js 16 requires turbopack.root and outputFileTracingRoot to be the same absolute path.
  turbopack: { root: appRoot },
  outputFileTracingRoot: appRoot,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
