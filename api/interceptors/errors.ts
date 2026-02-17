import type { AxiosInstance } from 'axios';
import toast from 'react-hot-toast';
import { ApiError } from '@/api/types';
import { showErrorToast } from '@/lib/utils/toast-helpers';

/** User-facing message for network/connection failures. Shown only in logs for devs; no toast. */
const NETWORK_ERROR_MESSAGE = 'Connection problem. Some data may not have loaded.';

/** Time window in ms: same error key only shows one toast within this window. */
const DEDUP_WINDOW_MS = 5000;

/** In-memory deduplication: last shown toast key and time. */
let lastToastKey: string | null = null;
let lastToastTime = 0;

/**
 * Returns true if the error indicates a network/connection issue (no response or timeout).
 */
function isNetworkError(err: unknown): boolean {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: unknown }).response;
    if (res != null) return false;
  }
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    const code = (err as { code?: string }).code;
    if (code === 'ERR_NETWORK') return true;
    if (msg === 'network error') return true;
    if (msg.includes('timeout') && msg.includes('exceeded')) return true;
  }
  return false;
}

/**
 * Normalizes Axios error response body to ApiError shape.
 * Network-style errors (no response, timeout, ERR_NETWORK) get a single user-facing message.
 */
function normalizeError(err: unknown): ApiError {
  if (err && typeof err === 'object' && 'response' in err) {
    const res = (err as { response?: { data?: unknown; status?: number } }).response;
    if (res) {
      const data = res.data;
      const message =
        data && typeof data === 'object' && 'message' in data && typeof (data as { message: unknown }).message === 'string'
          ? (data as { message: string }).message
          : res.status === 401
            ? 'Unauthorized'
            : res.status === 403
              ? 'Forbidden'
              : res.status && res.status >= 500
                ? 'Server error. Please try again.'
                : 'Request failed';
      return {
        message,
        status: res.status,
        code: data && typeof data === 'object' && 'code' in data ? String((data as { code: unknown }).code) : undefined,
      };
    }
  }
  if (err instanceof Error) {
    if (isNetworkError(err)) {
      return { message: NETWORK_ERROR_MESSAGE };
    }
    return { message: err.message };
  }
  return { message: 'Request failed' };
}

/**
 * Key used for deduplication: same key within DEDUP_WINDOW_MS only shows one toast.
 */
function getToastKey(apiError: ApiError): string {
  return apiError.message === NETWORK_ERROR_MESSAGE ? 'network' : apiError.message;
}

/**
 * Applies response/error interceptors to the Axios instance.
 * On 4xx/5xx, normalizes to ApiError and rethrows so TanStack Query sees failures.
 * Error toasts are deduplicated by key within DEDUP_WINDOW_MS so repeated failures show one toast per burst.
 */
export function applyErrorInterceptors(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = normalizeError(error);
      const isNetwork = apiError.message === NETWORK_ERROR_MESSAGE;

      if (isNetwork) {
        const config = error.config as { url?: string; method?: string } | undefined;
        console.error(
          `[API] ${NETWORK_ERROR_MESSAGE}`,
          {
            url: config?.url,
            method: config?.method,
            error: error instanceof Error ? error.message : error,
          },
          error
        );
      } else {
        const skipToast = (error.config as { meta?: { skipErrorToast?: boolean } })?.meta?.skipErrorToast;
        if (!skipToast) {
          const key = getToastKey(apiError);
          const now = Date.now();
          if (key !== lastToastKey || now - lastToastTime >= DEDUP_WINDOW_MS) {
            showErrorToast(apiError.message, toast);
            lastToastKey = key;
            lastToastTime = now;
          }
        }
      }

      const enhanced = new Error(apiError.message) as Error & { apiError?: ApiError };
      enhanced.apiError = apiError;
      throw enhanced;
    }
  );
}
