import axios, { type AxiosInstance } from 'axios';
import { applyErrorInterceptors } from '@/api/interceptors/errors';
import { getTokenWithRetry } from '@/api/clerk-token-retry';
import { clearClerkTokenCache } from '@/lib/clerk-token-cache';
import { debugApi, isApiDebugEnabled } from '@/lib/api-debug';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';

export type GetTokenFn = () => Promise<string | null>;

export type CreateApiClientOptions = {
  getToken?: GetTokenFn;
  /** Must match useTokenReady / useApiClient org scope so the token cache hits. */
  tokenCacheKey?: string;
};

/**
 * Creates an Axios instance with base URL, JSON headers, and optional token injection.
 * Request interceptor: cache-first getToken with short retries on cold start; sets Authorization.
 * If token is still null after retries, the request is rejected (not sent) so token gating is
 * enforced in one place. Error interceptor normalizes errors and shows a toast.
 * To suppress the error toast for a specific request, pass meta: { skipErrorToast: true } in the config.
 */
export function createApiClient(
  getTokenOrOptions?: GetTokenFn | CreateApiClientOptions
): AxiosInstance {
  const options: CreateApiClientOptions =
    typeof getTokenOrOptions === 'function'
      ? { getToken: getTokenOrOptions }
      : (getTokenOrOptions ?? {});
  const { getToken, tokenCacheKey = '' } = options;
  const instance = axios.create({
    baseURL: API_URL,
    timeout: 20_000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  // Let multipart/form-data requests set Content-Type with boundary (e.g. file uploads).
  instance.interceptors.request.use((config) => {
    if (config.data instanceof FormData) {
      delete config.headers['Content-Type'];
    }
    return config;
  }, (err) => Promise.reject(err));

  if (getToken) {
    instance.interceptors.request.use(
      async (config) => {
        const method = (config.method ?? 'get').toUpperCase();
        const path = config.url ?? '';
        if (isApiDebugEnabled()) {
          debugApi('axios request', { phase: 'before_token', method, path });
        }
        try {
          const { token, attempts } = await getTokenWithRetry(getToken, tokenCacheKey);
          if (isApiDebugEnabled()) {
            debugApi('axios request', { phase: 'token_ok', method, path, attempts });
          }
          config.headers.Authorization = `Bearer ${token}`;
          return config;
        } catch (err) {
          if (isApiDebugEnabled()) {
            debugApi('axios request', {
              phase: 'token_failed',
              method,
              path,
              error: err instanceof Error ? err.message : String(err),
            });
          }
          throw err;
        }
      },
      (err) => Promise.reject(err)
    );
  }

  applyErrorInterceptors(instance);

  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        clearClerkTokenCache();
      }
      return Promise.reject(error);
    }
  );

  return instance;
}
