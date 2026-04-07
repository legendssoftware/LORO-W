/** Prefix for console filtering when `NEXT_PUBLIC_API_DEBUG=1`. */
export const API_DEBUG_PREFIX = '[LORO API]' as const;

export function isApiDebugEnabled(): boolean {
  return process.env.NEXT_PUBLIC_API_DEBUG === '1';
}

/** Opt-in debug logging for Clerk token gating and API requests. Never log secrets or full JWTs. */
export function debugApi(message: string, data?: Record<string, unknown>): void {
  if (!isApiDebugEnabled()) return;
  if (data !== undefined) {
    console.log(API_DEBUG_PREFIX, message, data);
  } else {
    console.log(API_DEBUG_PREFIX, message);
  }
}
