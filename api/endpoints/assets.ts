import type { AxiosInstance } from 'axios';
import type {
  AssetsByUserResponse,
  CreateAssetPayload,
  CreateAssetResponse,
} from '@/api/types/asset';

function isAssetsByUserResponse(value: unknown): value is AssetsByUserResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'assets' in value
  );
}

/** GET /assets/for/:userUid — assets assigned to a user. */
export async function getAssetsByUser(
  client: AxiosInstance,
  userUid: number
): Promise<AssetsByUserResponse> {
  const { data } = await client.get<
    AssetsByUserResponse | { data: AssetsByUserResponse }
  >(`/assets/for/${userUid}`);

  if (isAssetsByUserResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isAssetsByUserResponse((data as { data: AssetsByUserResponse }).data)
  ) {
    return (data as { data: AssetsByUserResponse }).data;
  }
  throw new Error('Invalid assets-by-user response');
}

/** POST /assets — create a new asset. */
export async function createAsset(
  client: AxiosInstance,
  payload: CreateAssetPayload
): Promise<CreateAssetResponse> {
  const { data } = await client.post<CreateAssetResponse>('/assets', payload);
  return data;
}
