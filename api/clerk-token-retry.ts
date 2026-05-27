import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';
import type { GetTokenFn } from '@/api/client';
import { resolveClerkToken } from '@/lib/clerk-token-cache';

/** Delay in ms before retrying getToken() when it returns null (e.g. token not ready yet). */
const TOKEN_RETRY_DELAY_MS = 300;
/** Max number of getToken() attempts (initial + retries) before rejecting the request. */
const TOKEN_MAX_ATTEMPTS = 3;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Resolves a Clerk token with cache-first lookup and short retries on cold start.
 */
export async function getTokenWithRetry(
  getToken: GetTokenFn,
  cacheKey: string
): Promise<{ token: string; attempts: number }> {
  for (let attempt = 1; attempt <= TOKEN_MAX_ATTEMPTS; attempt++) {
    const token = await resolveClerkToken(getToken, cacheKey);
    if (token) return { token, attempts: attempt };
    if (isApiDebugEnabled()) {
      debugApi('getToken retry', { attempt, maxAttempts: TOKEN_MAX_ATTEMPTS });
    }
    if (attempt < TOKEN_MAX_ATTEMPTS) {
      await delay(TOKEN_RETRY_DELAY_MS);
    }
  }
  throw new Error('Token not ready. Please sign in again or refresh the page.');
}
