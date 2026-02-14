import axios, { type AxiosInstance } from 'axios';
import { applyErrorInterceptors } from '@/api/interceptors/errors';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4400';

export type GetTokenFn = () => Promise<string | null>;

/**
 * Creates an Axios instance with base URL, JSON headers, and optional token injection.
 * Request interceptor calls getToken() and sets Authorization: Bearer <token> when available.
 * Error interceptor normalizes 4xx/5xx to a consistent shape and rethrows.
 */
export function createApiClient(getToken?: GetTokenFn): AxiosInstance {
  const instance = axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (getToken) {
    instance.interceptors.request.use(async (config) => {
      const token = await getToken();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });
  }

  applyErrorInterceptors(instance);
  return instance;
}
