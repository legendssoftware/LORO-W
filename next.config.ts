import type { NextConfig } from "next";
import path from "path";
import { fileURLToPath } from "url";

/** Next app root (directory containing this file). Never use process.cwd() — it breaks resolution when dev runs from the repo root. */
const appRoot = path.dirname(fileURLToPath(import.meta.url));

/** Browser origins the API client and Socket.IO may call. Derived from NEXT_PUBLIC_API_URL at build time. */
function apiConnectSources(): string[] {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (!raw) return [];
  try {
    const url = new URL(raw);
    const wsProtocol = url.protocol === "https:" ? "wss:" : "ws:";
    return [url.origin, `${wsProtocol}//${url.host}`];
  } catch {
    return [];
  }
}

/**
 * CSP allows Clerk widgets, MapLibre tiles, geocoding, and the marketing voice demo.
 * script-src keeps 'unsafe-inline' because Clerk injects its widgets that way.
 * 'unsafe-eval' stays so Next and the map worker are not blocked.
 */
function contentSecurityPolicy(): string {
  const connectSrc = [
    "'self'",
    "blob:",
    ...apiConnectSources(),
    "https://*.clerk.accounts.dev",
    "https://*.clerk.com",
    "https://clerk-telemetry.com",
    "https://*.clerk-telemetry.com",
    "https://challenges.cloudflare.com",
    "https://basemaps.cartocdn.com",
    "https://*.basemaps.cartocdn.com",
    "https://nominatim.openstreetmap.org",
    "https://api.mapbox.com",
    "https://*.tiles.mapbox.com",
    "https://events.mapbox.com",
    "https://api.vapi.ai",
    "wss://api.vapi.ai",
    "https://*.vapi.ai",
    "wss://*.vapi.ai",
    "https://*.daily.co",
    "wss://*.daily.co",
  ].join(" ");

  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    "frame-src 'self' https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com",
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self' https://*.clerk.accounts.dev https://*.clerk.com",
  ].join("; ");
}

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self), geolocation=(self), payment=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
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
