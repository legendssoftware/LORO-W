/**
 * Shared breadcrumb scrubbing for Sentry on web.
 * Strips URL query strings and redacts sensitive keys.
 */

const SENSITIVE_KEY =
	/authorization|token|password|secret|cookie|pin|otp|refresh|apikey/i;

export type ScrubbableBreadcrumb = {
	category?: string;
	message?: string;
	data?: Record<string, unknown>;
	[key: string]: unknown;
};

function stripUrlQuery(value: string): string {
	const q = value.indexOf('?');
	return q === -1 ? value : value.slice(0, q);
}

function redactSensitiveData(
	input: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
	if (!input) return undefined;
	const out: Record<string, unknown> = {};
	for (const [key, value] of Object.entries(input)) {
		if (SENSITIVE_KEY.test(key)) {
			out[key] = '[Filtered]';
			continue;
		}
		if (value && typeof value === 'object' && !Array.isArray(value)) {
			out[key] = redactSensitiveData(value as Record<string, unknown>);
			continue;
		}
		if (typeof value === 'string' && (key === 'url' || key === 'from' || key === 'to')) {
			out[key] = stripUrlQuery(value);
			continue;
		}
		out[key] = value;
	}
	return out;
}

/**
 * Sentry `beforeBreadcrumb` scrubber for the Next.js app.
 */
export function scrubSentryBreadcrumb<T extends ScrubbableBreadcrumb>(
	breadcrumb: T,
): T | null {
	const next = { ...breadcrumb } as T;
	if (typeof next.message === 'string' && next.message.includes('?')) {
		next.message = stripUrlQuery(next.message);
	}
	if (next.data && typeof next.data === 'object') {
		next.data = redactSensitiveData(next.data as Record<string, unknown>);
	}
	return next;
}
