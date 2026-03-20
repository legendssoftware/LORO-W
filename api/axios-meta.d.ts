import 'axios';

declare module 'axios' {
  export interface AxiosRequestConfig {
    meta?: {
      skipErrorToast?: boolean;
    };
  }
}
