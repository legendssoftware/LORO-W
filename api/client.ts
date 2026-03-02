import axios, { type AxiosInstance } from 'axios';
import { applyErrorInterceptors } from '@/api/interceptors/errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';

/** Delay in ms before retrying getToken() when it returns null (e.g. token not ready yet). */
const TOKEN_RETRY_DELAY_MS = 300;
/** Max number of getToken() attempts (initial + retries) before rejecting the request. */
const TOKEN_MAX_ATTEMPTS = 3;

export type GetTokenFn = () => Promise<string | null>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Attempts getToken() with short retries so the first requests after sign-in can get a token
 * once Clerk has it ready. If still null after retries, rejects so the request is not sent.
 */
async function getTokenWithRetry(getToken: GetTokenFn): Promise<string> {
  for (let attempt = 1; attempt <= TOKEN_MAX_ATTEMPTS; attempt++) {
    const token = await getToken();
    if (token) return token;
    if (attempt < TOKEN_MAX_ATTEMPTS) {
      await delay(TOKEN_RETRY_DELAY_MS);
    }
  }
  throw new Error('Token not ready. Please sign in again or refresh the page.');
}

/**
 * Creates an Axios instance with base URL, JSON headers, and optional token injection.
 * Request interceptor: calls getToken() with short retries; sets Authorization when token is available.
 * If token is still null after retries, the request is rejected (not sent) so token gating is
 * enforced in one place. Error interceptor normalizes errors and shows a toast.
 * To suppress the error toast for a specific request, pass meta: { skipErrorToast: true } in the config.
 */
export function createApiClient(getToken?: GetTokenFn): AxiosInstance {
  const instance = axios.create({
    baseURL: API_URL,
    timeout: 20_000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (getToken) {
    instance.interceptors.request.use(
      async (config) => {
        const token = await getTokenWithRetry(getToken);
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      },
      (err) => Promise.reject(err)
    );
  }

  applyErrorInterceptors(instance);
  return instance;
}
