import axios from 'axios';
import type { ApiError } from '@/api/types';

type ErrorWithApiError = Error & { apiError?: ApiError };

/** Server returns this when Clerk JWT verify fails on POST /auth/sync-clerk (and client-auth sync). */
export const CLERK_JWT_INVALID_CODE = 'CLERK_JWT_INVALID';

/**
 * Extracts normalized API error from thrown values (Axios interceptor attaches `apiError`).
 */
export function getApiError(error: unknown): ApiError | undefined {
  if (error && typeof error === 'object' && 'apiError' in error) {
    const ae = (error as ErrorWithApiError).apiError;
    if (ae && typeof ae === 'object' && typeof ae.message === 'string') {
      return ae;
    }
  }
  return undefined;
}

/**
 * HTTP status from normalized client errors, or raw Axios response when still unwrapped.
 */
export function getErrorStatus(error: unknown): number | undefined {
  const fromApi = getApiError(error);
  if (fromApi?.status != null && Number.isFinite(fromApi.status)) {
    return fromApi.status;
  }
  if (axios.isAxiosError(error) && error.response?.status != null) {
    return error.response.status;
  }
  return undefined;
}

function isTransientNetworkError(error: unknown): boolean {
  if (error == null || typeof error !== 'object') return false;
  const err = error as { code?: string; message?: string; name?: string; isTimeout?: boolean };
  if (err.isTimeout || err.name === 'TimeoutError') return true;
  if (err.code === 'ECONNABORTED' || err.code === 'ERR_NETWORK') return true;
  if (axios.isAxiosError(error) && error.response == null) return true;
  const msg = (err.message ?? '').toLowerCase();
  return msg.includes('timeout') || msg === 'network error' || msg.includes('connection problem');
}

/**
 * Retry only transient failures: network, timeout, 408, 429, 5xx.
 * Never retry 401/403/404 or other 4xx. Max 2 retries (3 attempts).
 */
export function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  const status = getErrorStatus(error);
  if (status != null) {
    if (status === 408 || status === 429 || status >= 500) return true;
    return false;
  }
  return isTransientNetworkError(error);
}

/** Exponential backoff capped at 8s so a dead endpoint does not add 30s. */
export function defaultQueryRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 8_000);
}

/** User-facing message for query error UI (matches interceptor normalization when present). */
export function getQueryErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const api = getApiError(error);
  if (api?.message) return api.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

/** True when sync-clerk failed with an invalid/expired Clerk JWT — client should sign out. */
export function shouldEndSessionAfterClerkSyncFailure(error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status !== 401) return false;
  const api = getApiError(error);
  if (api?.code === CLERK_JWT_INVALID_CODE) return true;
  const msg = (api?.message ?? '').toLowerCase();
  return (
    msg.includes('session has expired') ||
    msg.includes('session is invalid') ||
    msg.includes('could not be verified') ||
    msg.includes('waiting for manager approval') ||
    msg.includes('has been deactivated')
  );
}
