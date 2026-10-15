import type { AxiosInstance } from 'axios';
import type {
  AssetItemResponse,
  AssetListParams,
  AssetsByUserResponse,
  AssetsListResponse,
  CreateAssetPayload,
  CreateAssetResponse,
  DeleteAssetResponse,
  UpdateAssetPayload,
  UpdateAssetResponse,
} from '@/api/types/asset';

function isAssetsByUserResponse(value: unknown): value is AssetsByUserResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'assets' in value
  );
}

function isCreateAssetResponse(value: unknown): value is CreateAssetResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'asset' in value &&
    typeof (value as CreateAssetResponse).asset === 'object' &&
    (value as CreateAssetResponse).asset != null &&
    typeof (value as CreateAssetResponse).asset.uid === 'number'
  );
}

function isAssetsListResponse(value: unknown): value is AssetsListResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'assets' in value
  );
}

/** GET /assets — organisation inventory for admin, owner, and manager; linked assets for everyone else. */
export async function getAssets(
  client: AxiosInstance,
  params?: AssetListParams
): Promise<AssetsListResponse> {
  const { data } = await client.get<AssetsListResponse | { data: AssetsListResponse }>('/assets', {
    params,
  });

  if (isAssetsListResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isAssetsListResponse((data as { data: AssetsListResponse }).data)
  ) {
    return (data as { data: AssetsListResponse }).data;
  }
  throw new Error('Invalid assets list response');
}

function isAssetItemResponse(value: unknown): value is AssetItemResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value &&
    'asset' in value &&
    typeof (value as AssetItemResponse).asset === 'object' &&
    (value as AssetItemResponse).asset != null &&
    typeof (value as AssetItemResponse).asset.uid === 'number'
  );
}

/** GET /assets/:ref — one asset when the caller may see it. */
export async function getAsset(
  client: AxiosInstance,
  uid: number
): Promise<AssetItemResponse> {
  const { data } = await client.get<AssetItemResponse | { data: AssetItemResponse }>(
    `/assets/${uid}`
  );

  if (isAssetItemResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isAssetItemResponse((data as { data: AssetItemResponse }).data)
  ) {
    return (data as { data: AssetItemResponse }).data;
  }
  throw new Error('Invalid asset response');
}

/** GET /assets/for/:userUid — assets owned by or assigned to a user. */
export async function getAssetsByUser(
  client: AxiosInstance,
  userUid: number,
  params?: AssetListParams
): Promise<AssetsByUserResponse> {
  const { data } = await client.get<
    AssetsByUserResponse | { data: AssetsByUserResponse }
  >(`/assets/for/${userUid}`, { params });

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
  const { data } = await client.post<
    CreateAssetResponse | { data: CreateAssetResponse }
  >('/assets', payload);

  if (isCreateAssetResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isCreateAssetResponse((data as { data: CreateAssetResponse }).data)
  ) {
    return (data as { data: CreateAssetResponse }).data;
  }
  throw new Error('Invalid create-asset response');
}

function isUpdateAssetResponse(value: unknown): value is UpdateAssetResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value
  );
}

function isDeleteAssetResponse(value: unknown): value is DeleteAssetResponse {
  return (
    typeof value === 'object' &&
    value != null &&
    'message' in value
  );
}

/** PATCH /assets/:ref — update an existing asset. */
export async function updateAsset(
  client: AxiosInstance,
  uid: number,
  payload: UpdateAssetPayload
): Promise<UpdateAssetResponse> {
  const { data } = await client.patch<
    UpdateAssetResponse | { data: UpdateAssetResponse }
  >(`/assets/${uid}`, payload);

  if (isUpdateAssetResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isUpdateAssetResponse((data as { data: UpdateAssetResponse }).data)
  ) {
    return (data as { data: UpdateAssetResponse }).data;
  }
  throw new Error('Invalid update-asset response');
}

/** DELETE /assets/:ref — soft-delete an asset. */
export async function deleteAsset(
  client: AxiosInstance,
  uid: number
): Promise<DeleteAssetResponse> {
  const { data } = await client.delete<
    DeleteAssetResponse | { data: DeleteAssetResponse }
  >(`/assets/${uid}`);

  if (isDeleteAssetResponse(data)) return data;
  if (
    data &&
    typeof data === 'object' &&
    'data' in data &&
    isDeleteAssetResponse((data as { data: DeleteAssetResponse }).data)
  ) {
    return (data as { data: DeleteAssetResponse }).data;
  }
  throw new Error('Invalid delete-asset response');
}
