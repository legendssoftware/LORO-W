/**
 * API error shape used by the error interceptor and hooks.
 */

export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}
