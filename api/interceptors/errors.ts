import type { AxiosInstance } from 'axios';
import { ApiError } from '@/api/types';

/**
 * Normalizes Axios error response body to ApiError shape.
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
    return { message: err.message };
  }
  return { message: 'Request failed' };
}

/**
 * Applies response/error interceptors to the Axios instance.
 * On 4xx/5xx, normalizes to ApiError and rethrows so TanStack Query sees failures.
 */
export function applyErrorInterceptors(axiosInstance: AxiosInstance): void {
  axiosInstance.interceptors.response.use(
    (response) => response,
    (error) => {
      const apiError = normalizeError(error);
      const enhanced = new Error(apiError.message) as Error & { apiError?: ApiError };
      enhanced.apiError = apiError;
      throw enhanced;
    }
  );
}
