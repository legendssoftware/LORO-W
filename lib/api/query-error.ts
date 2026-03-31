import axios from 'axios';
import type { ApiError } from '@/api/types';

type ErrorWithApiError = Error & { apiError?: ApiError };

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

/** Default TanStack Query retry: no retry on client/permission errors; exponential cap elsewhere. */
export function defaultQueryRetry(failureCount: number, error: unknown): boolean {
  const status = getErrorStatus(error);
  if (status === 401 || status === 403 || status === 404) return false;
  return failureCount < 2;
}

export function defaultQueryRetryDelay(attemptIndex: number): number {
  return Math.min(1000 * 2 ** attemptIndex, 30_000);
}

/** User-facing message for query error UI (matches interceptor normalization when present). */
export function getQueryErrorMessage(error: unknown, fallback = 'Something went wrong'): string {
  const api = getApiError(error);
  if (api?.message) return api.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
