import * as Sentry from '@sentry/nextjs';

export type ReportableApiError = {
	message: string;
	status?: number;
	correlationId?: string;
};

/**
 * Report normalized API failures to Sentry for network, 5xx, 409, and 422.
 * Skips 401/403. Never attaches request bodies or headers.
 */
export function shouldReportWebApiError(status: number | undefined): boolean {
	if (typeof status !== 'number') return true;
	if (status === 401 || status === 403) return false;
	if (status === 409 || status === 422) return true;
	return status >= 500;
}

/**
 * Capture an API error after normalization. Tags correlationId when present.
 */
export function reportWebApiErrorToSentry(apiError: ReportableApiError): void {
	if (!shouldReportWebApiError(apiError.status)) return;

	const tags: Record<string, string> = {
		http_status:
			typeof apiError.status === 'number' ? String(apiError.status) : 'network',
	};
	if (apiError.correlationId) tags.correlation_id = apiError.correlationId;

	Sentry.captureException(new Error(apiError.message), {
		tags,
		extra: {
			api_message: apiError.message,
			...(apiError.correlationId ? { correlation_id: apiError.correlationId } : {}),
		},
	});
}
