import * as Sentry from '@sentry/nextjs';

/**
 * Next.js instrumentation hook — loads Sentry server/edge configs at runtime.
 * @see https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 */
export async function register(): Promise<void> {
	if (process.env.NEXT_RUNTIME === 'nodejs') {
		await import('./sentry.server.config');
	}
	if (process.env.NEXT_RUNTIME === 'edge') {
		await import('./sentry.edge.config');
	}
}

export const onRequestError = Sentry.captureRequestError;
