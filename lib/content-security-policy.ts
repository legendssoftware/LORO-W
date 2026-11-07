/**
 * Production Clerk is on a custom domain (clerk.loro.co.za / accounts.loro.co.za).
 * A publishable key only encodes the Frontend API host, so the Account Portal
 * host is added beside it. Dev keys (*.clerk.accounts.dev) stay covered by the
 * wildcards in the policy.
 */
const PRODUCTION_CLERK_ORIGINS = [
  "https://clerk.loro.co.za",
  "https://accounts.loro.co.za",
] as const;

function decodeClerkFrontendHost(publishableKey: string | undefined): string | null {
  const key = publishableKey?.trim();
  if (!key) return null;
  const encoded = key.replace(/^pk_(test|live)_/, "");
  try {
    const decoded = Buffer.from(encoded, "base64").toString("utf8").replace(/\$$/, "").trim();
    if (!decoded || !/^[a-z0-9.-]+$/i.test(decoded)) return null;
    return decoded;
  } catch {
    return null;
  }
}

/** HTTPS origins the browser may use to reach Clerk (Frontend API and Account Portal). */
export function clerkBrowserOrigins(publishableKey: string | undefined): string[] {
  const origins = new Set<string>(PRODUCTION_CLERK_ORIGINS);
  const frontendHost = decodeClerkFrontendHost(publishableKey);
  if (frontendHost) {
    origins.add(`https://${frontendHost}`);
    if (frontendHost.startsWith("clerk.")) {
      origins.add(`https://accounts.${frontendHost.slice("clerk.".length)}`);
    }
  }
  return [...origins];
}

function withWebSockets(origins: string[]): string[] {
  const sources = [...origins];
  for (const origin of origins) {
    if (origin.startsWith("https://")) {
      sources.push(`wss://${origin.slice("https://".length)}`);
    }
  }
  return sources;
}

/** Browser origins the API client and Socket.IO may call. Derived from NEXT_PUBLIC_API_URL at build time. */
export function apiConnectSources(apiUrl: string | undefined): string[] {
  const raw = apiUrl?.trim();
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
export function contentSecurityPolicy(env: {
  apiUrl?: string;
  clerkPublishableKey?: string;
}): string {
  const clerkOrigins = clerkBrowserOrigins(env.clerkPublishableKey);
  const connectSrc = [
    "'self'",
    "blob:",
    ...apiConnectSources(env.apiUrl),
    ...withWebSockets(clerkOrigins),
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

  const clerkHttps = clerkOrigins.join(" ");

  return [
    "default-src 'self'",
    `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${clerkHttps} https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "media-src 'self' blob: https:",
    "font-src 'self' data:",
    `connect-src ${connectSrc}`,
    "worker-src 'self' blob:",
    "child-src 'self' blob:",
    `frame-src 'self' ${clerkHttps} https://challenges.cloudflare.com https://*.clerk.accounts.dev https://*.clerk.com`,
    "frame-ancestors 'none'",
    "object-src 'none'",
    "base-uri 'self'",
    `form-action 'self' ${clerkHttps} https://*.clerk.accounts.dev https://*.clerk.com`,
  ].join("; ");
}
