import type { AxiosInstance } from 'axios';
import type { TargetsProgressBucket, TargetsProgressData } from '@/api/types/targets-progress';

export interface GetTargetsProgressParams {
  from: string;
  to: string;
  bucket?: TargetsProgressBucket;
  organisationId?: string | number;
  branchId?: number;
  userUid?: number;
}

function isTargetsProgressData(value: unknown): value is TargetsProgressData {
  if (value === null || typeof value !== 'object') return false;
  const o = value as Record<string, unknown>;
  return Array.isArray(o.aggregateBuckets) && Array.isArray(o.users);
}

/**
 * GET /reports/targets-progress — prorated targets vs check-in/leads actuals by bucket.
 */
export async function getTargetsProgress(
  client: AxiosInstance,
  params: GetTargetsProgressParams
): Promise<TargetsProgressData> {
  const { data } = await client.get<
    TargetsProgressData | { data: TargetsProgressData; success?: boolean }
  >('/reports/targets-progress', {
    params: {
      from: params.from,
      to: params.to,
      ...(params.bucket ? { bucket: params.bucket } : {}),
      ...(params.organisationId != null
        ? { organisationId: params.organisationId }
        : {}),
      ...(params.branchId != null ? { branchId: params.branchId } : {}),
      ...(params.userUid != null ? { userUid: params.userUid } : {}),
    },
  });

  if (isTargetsProgressData(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isTargetsProgressData((data as { data: unknown }).data)
  ) {
    return (data as { data: TargetsProgressData }).data;
  }
  throw new Error('Invalid targets progress response');
}
