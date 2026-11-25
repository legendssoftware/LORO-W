import * as Sentry from '@sentry/nextjs';
import { buildWebSentryBaseOptions } from '@/lib/sentry/init-options';

Sentry.init({
	...buildWebSentryBaseOptions(),
});

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
