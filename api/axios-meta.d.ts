import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    meta?: {
      /** Suppress global error toast; use with inline UI (e.g. `QueryErrorBanner`). */
      skipErrorToast?: boolean;
    };
  }
}
