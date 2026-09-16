import type { AxiosInstance } from 'axios';
import type { TravelAnalysisPayload } from '@/lib/travel-analysis/travel-analysis-types';

export type TravelAnalysisParams = {
  from: string;
  to: string;
  userUid: number;
  skipErrorToast?: boolean;
};

type TravelAnalysisApiEnvelope = {
  success?: boolean;
  message?: string;
  data?: TravelAnalysisPayload;
};

function isPayload(value: unknown): value is TravelAnalysisPayload {
  if (!value || typeof value !== 'object') return false;
  const row = value as TravelAnalysisPayload;
  return typeof row.fromYmd === 'string' && typeof row.toYmd === 'string' && Array.isArray(row.daily);
}

/**
 * GET /reports/travel-analysis — per-user travel facts for the Analysis PDF.
 */
export async function fetchTravelAnalysis(
  client: AxiosInstance,
  params: TravelAnalysisParams,
): Promise<TravelAnalysisPayload> {
  const response = await client.get<TravelAnalysisApiEnvelope | TravelAnalysisPayload>(
    '/reports/travel-analysis',
    {
      params: {
        from: params.from,
        to: params.to,
        userUid: params.userUid,
      },
      timeout: 120_000,
      ...(params.skipErrorToast ? { meta: { skipErrorToast: true } } : {}),
    },
  );
  const body = response.data;
  if (isPayload(body)) return body;
  if (body && typeof body === 'object' && isPayload(body.data)) return body.data;
  throw new Error('Travel analysis response was empty');
}
