/** Seconds the idle dialog stays open before automatic sign-out. */
export const IDLE_SIGNOUT_MS = 30_000;

/**
 * True when the user has been inactive at least `timeoutMs`.
 * A non-positive timeout disables the idle prompt.
 */
export function isIdleExpired(lastActivityAt: number, now: number, timeoutMs: number): boolean {
  if (timeoutMs <= 0) return false;
  return now - lastActivityAt >= timeoutMs;
}
