/**
 * In-memory Clerk session token cache shared by useTokenReady and the Axios client.
 * Avoids awaiting getToken() on every HTTP request when the session token is unchanged.
 */

const REFRESH_BEFORE_EXPIRY_SEC = 60;

type CacheEntry = {
  token: string;
  cacheKey: string;
  expiresAtMs: number | null;
};

let entry: CacheEntry | null = null;

/** Stable key for org-scoped Clerk getToken params. */
export function clerkTokenCacheKey(
  orgId: string | null | undefined,
  activeClerkOrganizationId: string | null | undefined
): string {
  return `${orgId ?? ''}|${activeClerkOrganizationId ?? ''}`;
}

function jwtExpiresAtMs(token: string): number | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1])) as { exp?: number };
    if (typeof payload.exp !== 'number') return null;
    return payload.exp * 1000;
  } catch {
    return null;
  }
}

function isEntryValid(cached: CacheEntry): boolean {
  if (!cached.token) return false;
  if (cached.expiresAtMs == null) return true;
  return Date.now() < cached.expiresAtMs - REFRESH_BEFORE_EXPIRY_SEC * 1000;
}

export function seedClerkTokenCache(token: string, cacheKey: string): void {
  entry = {
    token,
    cacheKey,
    expiresAtMs: jwtExpiresAtMs(token),
  };
}

export function clearClerkTokenCache(): void {
  entry = null;
}

export function getCachedClerkToken(cacheKey: string): string | null {
  if (!entry || entry.cacheKey !== cacheKey) return null;
  if (!isEntryValid(entry)) {
    entry = null;
    return null;
  }
  return entry.token;
}

/**
 * Returns a cached token when valid; otherwise calls getToken and updates the cache.
 */
export async function resolveClerkToken(
  getToken: () => Promise<string | null>,
  cacheKey: string
): Promise<string | null> {
  const cached = getCachedClerkToken(cacheKey);
  if (cached) return cached;

  const token = await getToken();
  if (token) {
    seedClerkTokenCache(token, cacheKey);
  }
  return token;
}
