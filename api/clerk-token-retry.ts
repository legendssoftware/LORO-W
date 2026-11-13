import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';
import type { GetTokenFn } from '@/api/client';
import { resolveClerkToken } from '@/lib/clerk-token-cache';

/** Per-attempt cap so a getToken() call that never settles cannot block the request. */
const TOKEN_ATTEMPT_TIMEOUT_MS = 5_000;
/**
 * Gaps between attempts. A laptop wake often needs a few seconds before Clerk can mint a token.
 * Four attempts: immediate, then 0.5s, 1s, and 2s.
 */
const TOKEN_RETRY_DELAYS_MS = [500, 1_000, 2_000] as const;

const TOKEN_MAX_ATTEMPTS = TOKEN_RETRY_DELAYS_MS.length + 1;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/** Delay before the next getToken() attempt. `failedAttempts` is 1 after the first miss. */
export function tokenRetryDelayMs(failedAttempts: number): number {
  const index = Math.min(Math.max(failedAttempts, 1), TOKEN_RETRY_DELAYS_MS.length) - 1;
  return TOKEN_RETRY_DELAYS_MS[index];
}

/**
 * Resolves `promise` or rejects when `timeoutMs` elapses.
 * The original promise is left running; callers must ignore a late result.
 */
export async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Token request timed out')), timeoutMs);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Resolves a Clerk token with cache-first lookup and spaced retries after wake or cold start.
 */
export async function getTokenWithRetry(
  getToken: GetTokenFn,
  cacheKey: string
): Promise<{ token: string; attempts: number }> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= TOKEN_MAX_ATTEMPTS; attempt++) {
    try {
      const token = await withTimeout(
        resolveClerkToken(getToken, cacheKey),
        TOKEN_ATTEMPT_TIMEOUT_MS
      );
      if (token) return { token, attempts: attempt };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error('Token request timed out');
      if (isApiDebugEnabled()) {
        debugApi('getToken retry', {
          attempt,
          maxAttempts: TOKEN_MAX_ATTEMPTS,
          error: lastError.message,
        });
      }
    }
    if (isApiDebugEnabled()) {
      debugApi('getToken retry', { attempt, maxAttempts: TOKEN_MAX_ATTEMPTS });
    }
    if (attempt < TOKEN_MAX_ATTEMPTS) {
      await delay(tokenRetryDelayMs(attempt));
    }
  }
  throw lastError ?? new Error('Token not ready. Please sign in again or refresh the page.');
}
