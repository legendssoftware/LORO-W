import { showErrorToast } from './toast-helpers';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ToastFn = any;

export function handleVapiError(error: unknown, toast: ToastFn, options?: { silent?: boolean }) {
  const message = error instanceof Error ? error.message : String(error);
  console.error('Vapi error:', message);
  if (!options?.silent) {
    const userMessage =
      /permission|denied|microphone/i.test(message)
        ? 'Microphone access denied. Please enable microphone permissions.'
        : /network|connection|offline/i.test(message)
          ? 'Network issue. Please check your connection.'
          : 'Voice assistant error. Please try again.';
    showErrorToast(userMessage, toast);
  }
}

export async function retryVapiOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number,
  toast: ToastFn,
  options?: { onRetry?: () => void }
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries && options?.onRetry) options.onRetry();
      else {
        handleVapiError(e, toast);
        throw e;
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw lastError;
}
