import { scrubSentryBreadcrumb } from '@/lib/sentry/before-breadcrumb';

/**
 * Shared Sentry init options for client / server / edge.
 *
 * DSN: `NEXT_PUBLIC_SENTRY_DSN` only — do not hardcode.
 * Mobile Expo DSN lives in apk/; reuse it here only if the team intentionally
 * points web at the same Sentry project via env (not as a code fallback).
 */
export function getWebSentryDsn(): string | undefined {
	const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN?.trim();
	return dsn || undefined;
}

export function getWebTracesSampleRate(): number {
	return process.env.NODE_ENV === 'development' ? 1.0 : 0.1;
}

/**
 * Base options used by instrumentation-client, server, and edge configs.
 * SDK is enabled only when a DSN is set.
 */
export function buildWebSentryBaseOptions() {
	const dsn = getWebSentryDsn();
	return {
		dsn,
		enabled: Boolean(dsn),
		sendDefaultPii: false as const,
		tracesSampleRate: getWebTracesSampleRate(),
		beforeBreadcrumb: scrubSentryBreadcrumb,
	};
}
