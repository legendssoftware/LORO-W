import { clearClerkTokenCache, seedClerkTokenCache } from '@/lib/clerk-token-cache';
import { withTimeout } from '@/api/clerk-token-retry';

/** Failures before the profile gate offers a manual retry. Background attempts continue. */
const ATTEMPTS_BEFORE_ERROR = 3;
const TOKEN_ATTEMPT_TIMEOUT_MS = 8_000;
const MAX_RETRY_DELAY_MS = 8_000;

export type ClerkTokenParams = { organizationId?: string };

export type ClerkTokenWatchState = {
  ready: boolean;
  token: string | null;
  error: Error | null;
};

type Watcher = (state: ClerkTokenWatchState) => void;

type Slot = {
  cacheKey: string;
  getToken: (params: ClerkTokenParams) => Promise<string | null>;
  params: ClerkTokenParams;
  watchers: Set<Watcher>;
  timer: ReturnType<typeof setTimeout> | null;
  attempts: number;
  ready: boolean;
  token: string | null;
  error: Error | null;
  disposed: boolean;
  requestId: number;
};

let slot: Slot | null = null;
let listening = false;

/** Delay before the next background token attempt. Grows until `MAX_RETRY_DELAY_MS`. */
export function nextTokenWatchDelayMs(failedAttempts: number): number {
  const exponent = Math.max(0, failedAttempts - 1);
  return Math.min(1_000 * 2 ** exponent, MAX_RETRY_DELAY_MS);
}

function snapshot(current: Slot): ClerkTokenWatchState {
  return { ready: current.ready, token: current.token, error: current.error };
}

function emit(current: Slot): void {
  const state = snapshot(current);
  current.watchers.forEach((watcher) => watcher(state));
}

function clearTimer(current: Slot): void {
  if (current.timer != null) {
    clearTimeout(current.timer);
    current.timer = null;
  }
}

function schedule(current: Slot): void {
  clearTimer(current);
  const delay = nextTokenWatchDelayMs(current.attempts);
  current.timer = setTimeout(() => {
    current.timer = null;
    if (current.disposed || current !== slot) return;
    void runAttempt(current);
  }, delay);
}

function fail(current: Slot, error: Error): void {
  current.attempts += 1;
  if (!current.ready && current.attempts >= ATTEMPTS_BEFORE_ERROR) {
    current.error = error;
  }
  emit(current);
  if (!current.ready) schedule(current);
}

async function runAttempt(current: Slot): Promise<void> {
  if (current.disposed || current !== slot) return;
  const requestId = ++current.requestId;
  clearTimer(current);
  try {
    const token = await withTimeout(current.getToken(current.params), TOKEN_ATTEMPT_TIMEOUT_MS);
    if (current.disposed || current !== slot || requestId !== current.requestId) return;
    if (!token) {
      fail(current, new Error('No token available'));
      return;
    }
    seedClerkTokenCache(token, current.cacheKey);
    current.token = token;
    current.ready = true;
    current.error = null;
    current.attempts = 0;
    emit(current);
  } catch (err) {
    if (current.disposed || current !== slot || requestId !== current.requestId) return;
    const error = err instanceof Error ? err : new Error('No token available');
    fail(current, error);
  }
}

function onWake(): void {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
  if (!slot || slot.disposed) return;
  clearTimer(slot);
  void runAttempt(slot);
}

function ensureListeners(): void {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  window.addEventListener('online', onWake);
  window.addEventListener('focus', onWake);
  document.addEventListener('visibilitychange', onWake);
}

/** Stop the shared token loop. Used when the session ends. */
export function stopClerkTokenWatch(): void {
  if (!slot) return;
  slot.disposed = true;
  slot.requestId += 1;
  clearTimer(slot);
  slot.watchers.clear();
  slot = null;
}

/**
 * Share one getToken() loop across every useTokenReady() caller.
 * A later failure does not clear `ready` once a token has been minted this session.
 * Unsubscribing does not stop the loop; call `resetClerkTokenWatch` on sign-out.
 */
export function watchClerkToken(
  cacheKey: string,
  getToken: (params: ClerkTokenParams) => Promise<string | null>,
  params: ClerkTokenParams,
  watcher: Watcher,
): () => void {
  ensureListeners();
  if (!slot || slot.cacheKey !== cacheKey) {
    const keepReady = Boolean(slot?.ready);
    const keepToken = keepReady ? (slot?.token ?? null) : null;
    if (slot) {
      slot.disposed = true;
      slot.requestId += 1;
      clearTimer(slot);
      slot.watchers.clear();
    }
    slot = {
      cacheKey,
      getToken,
      params,
      watchers: new Set(),
      timer: null,
      attempts: 0,
      ready: keepReady,
      token: keepToken,
      error: null,
      disposed: false,
      requestId: 0,
    };
    void runAttempt(slot);
  } else {
    slot.getToken = getToken;
    slot.params = params;
  }

  const current = slot;
  current.watchers.add(watcher);
  watcher(snapshot(current));
  return () => {
    current.watchers.delete(watcher);
  };
}

/** Drop the visible error and mint again. Called from the profile gate retry button. */
export function retryClerkTokenWatch(): void {
  if (!slot || slot.disposed) return;
  slot.attempts = 0;
  slot.error = null;
  emit(slot);
  void runAttempt(slot);
}

/** Clears the shared loop and the in-memory token. Paired with sign-out. */
export function resetClerkTokenWatch(): void {
  stopClerkTokenWatch();
  clearClerkTokenCache();
}
